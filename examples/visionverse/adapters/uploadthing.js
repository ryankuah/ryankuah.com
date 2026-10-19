export function useUploadThing() {
  return {
    startUpload: async (files) =>
      Promise.all(
        files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ ufsUrl: reader.result });
              reader.onerror = reject;
              reader.readAsDataURL(file);
            }),
        ),
      ),
  };
}
