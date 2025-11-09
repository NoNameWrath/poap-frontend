import { supabase } from '../lib/supabase';

async function publicUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Creates an event row, uploads optional image to bucket "poap",
 * writes metadata.json, then updates the event with image_url + metadata_uri.
 */
export async function createEventWithImage({ name, starts_at, ends_at, file }) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error('Not signed in');

  // 1) create event and get its id
  const { data: ev, error: insErr } = await supabase
    .from('events')
    .insert([{ name, starts_at, ends_at }])
    .select('id')
    .single();
  if (insErr) throw insErr;
  const eventId = ev.id;

  // 2) upload image (optional)
  let imageUrl = null;
  if (file) {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const contentType = file.type || (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`);
    const imgPath = `events/${eventId}/image.${ext}`;
    const { error: upErr } = await supabase.storage.from('poap').upload(imgPath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType
    });
    if (upErr) throw upErr;
    imageUrl = await publicUrl('poap', imgPath);
  }

  // 3) build metadata.json for this event
  const metadata = {
    name, // NFT name = event name
    symbol: 'POAP',
    description: `Proof of attendance: ${name}`,
    image: imageUrl,
    attributes: [
      { trait_type: 'Event', value: name },
      { trait_type: 'StartsAt', value: starts_at },
      { trait_type: 'EndsAt', value: ends_at }
    ]
  };
  const metaPath = `events/${eventId}/metadata.json`;
  const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
  const { error: metaErr } = await supabase.storage.from('poap').upload(metaPath, blob, {
    cacheControl: '3600',
    upsert: true,
    contentType: 'application/json'
  });
  if (metaErr) throw metaErr;
  const metadataUri = await publicUrl('poap', metaPath);

  // 4) update event with URLs
  const { error: updErr } = await supabase
    .from('events')
    .update({ image_url: imageUrl, metadata_uri: metadataUri })
    .eq('id', eventId);
  if (updErr) throw updErr;

  return { id: eventId, name, image_url: imageUrl, metadata_uri: metadataUri };
}
