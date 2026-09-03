import { base44 } from "@/api/base44Client";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // must match the signed S3 policy

/**
 * Uploads an image file to the business S3 bucket via a presigned POST.
 * The only upload path in the app — every photo/logo surface must call this.
 * @param {File} file - the (already compressed) image file to upload
 * @param {("photo"|"logo")} kind - 'photo' for damage photos, 'logo' for business logos
 * @returns {Promise<string>} - the public CDN URL of the stored object
 */
export async function uploadImageToS3(file, kind = "photo") {
  if (kind !== "photo" && kind !== "logo") {
    throw new Error("Invalid upload kind");
  }
  if (!navigator.onLine) {
    throw new Error("Upload requires a connection");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("That image is over 10 MB — please choose a smaller one.");
  }

  const presignResponse = await base44.functions.invoke("getUploadPresign", {
    kind,
    content_type: file.type,
    content_length: file.size,
  });
  const { upload_url, fields, cdn_url } = presignResponse.data;

  const postToS3 = async () => {
    const formData = new FormData();
    Object.entries(fields).forEach(([name, value]) => formData.append(name, value));
    formData.append("file", file);

    const res = await fetch(upload_url, { method: "POST", body: formData });
    if (res.ok) return cdn_url;

    const err = new Error("Upload failed. Please try again.");
    err.status = res.status;
    try {
      const xml = await res.text();
      const message = xml.match(/<Message>([\s\S]*?)<\/Message>/);
      if (message) err.message = message[1];
    } catch (_) { /* keep the default message */ }
    throw err;
  };

  try {
    return await postToS3();
  } catch (err) {
    // Single automatic retry on 5xx or network/timeout failures — never on 4xx.
    if (err.status && err.status < 500) throw err;
    return await postToS3();
  }
}