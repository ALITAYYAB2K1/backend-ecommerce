export const image_ID_Parser = (image) => {
  const imageParts = image.split("/");
  const filenameWithExt = imageParts[imageParts.length - 1];
  const publicId = filenameWithExt.split(".")[0];
  return publicId;
};
