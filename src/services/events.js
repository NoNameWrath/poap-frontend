import { supabase } from '../lib/supabase';

/**
 * Return a permanent, wallet-safe public URL for a given storage object path.
 * Requires the bucket to have public read access.
 */
async function publicUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? '';
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extFromMime(mime) {
  if (!mime) return 'png';
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('svg')) return 'svg';
  return 'png';
}

function safeSlug(s) {
  return (s || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
}

/**
 * Creates an event, uploads image to the PUBLIC bucket `poap`,
 * writes metadata.json that references the **public** image URL,
 * then updates the event row with { image_url, metadata_uri }.
 */
export async function createEventWithImage({ name, starts_at, ends_at, file }) {
  const { data: auth, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  assert(auth?.user, 'Not signed in');

  // 1) create the event first (so we can use its id in paths)
  const { data: ins, error: insErr } = await supabase
    .from('events')
    .insert([{ name, starts_at, ends_at }])
    .select('id')
    .single();
  if (insErr) throw insErr;
  const eventId = ins.id;

  let imageUrl = '';
  let metadataUri = '';

  // 2) if an image is provided, upload to public bucket and get a PUBLIC url
  if (file) {
    const ext = extFromMime(file.type);
    const base = `${safeSlug(name)}-${eventId}`;
    const imagePath = `events/${eventId}/${base}.${ext}`;

    const { error: upErr } = await supabase.storage.from('poap').upload(imagePath, file, {
      upsert: true,
      contentType: file.type || 'image/png',
      cacheControl: '31536000', // 1y
    });
    if (upErr) throw upErr;

    imageUrl = await publicUrl('poap', imagePath);
    assert(imageUrl, 'Failed to resolve public URL for image. Ensure the bucket "poap" is PUBLIC or has a read policy.');
  }

  // 3) build metadata JSON — always include an image field
  const meta = {
    name,
    symbol: 'POAP',
    description: `${name} attendance token`,
    image: imageUrl || 'https://dummyimage.com/512x512/eeeeee/555555.png&text=POAP',
    attributes: [
      { trait_type: 'Event', value: name },
      { trait_type: 'Starts At', value: String(starts_at) },
      { trait_type: 'Ends At', value: String(ends_at) },
    ],
    properties: {
      category: 'image',
      files: imageUrl
        ? [{ uri: imageUrl, type: (file && file.type) || 'image/png' }]
        : [{ uri: 'https://dummyimage.com/512x512/eeeeee/555555.png&text=POAP', type: 'image/png' }],
    },
  };

  const metaPath = `events/${eventId}/metadata.json`;
  const metaBlob = new Blob([JSON.stringify(meta)], { type: 'application/json' });
  const { error: metaErr } = await supabase.storage.from('poap').upload(metaPath, metaBlob, {
    upsert: true,
    contentType: 'application/json',
    cacheControl: '31536000',
  });
  if (metaErr) throw metaErr;

  metadataUri = await publicUrl('poap', metaPath);
  assert(metadataUri, 'Failed to resolve public URL for metadata. Ensure the bucket "poap" is PUBLIC or has a read policy.');

  // 4) update event with URLs
  const { error: updErr } = await supabase
    .from('events')
    .update({ image_url: imageUrl, metadata_uri: metadataUri })
    .eq('id', eventId);
  if (updErr) throw updErr;

  return { id: eventId, name, image_url: imageUrl, metadata_uri: metadataUri };
}
