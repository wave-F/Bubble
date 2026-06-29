export function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

export async function preloadFile(url) {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load file: ${url}`);
  }
  await response.arrayBuffer();
}

export async function runPreloadTasks(tasks, onProgress) {
  if (!tasks.length) {
    onProgress?.(1, "");
    return;
  }

  let completed = 0;
  const total = tasks.length;

  const report = (task) => {
    completed += 1;
    onProgress?.(completed / total, task.label || "");
  };

  await Promise.all(tasks.map(async (task) => {
    await task.run();
    report(task);
  }));
}