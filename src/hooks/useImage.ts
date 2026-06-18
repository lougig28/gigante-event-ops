import { useEffect, useState } from "react";

/** Load an HTMLImageElement for use as a Konva image. */
export function useImage(src: string | undefined): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    const onLoad = () => setImg(image);
    image.addEventListener("load", onLoad);
    image.src = src;
    return () => image.removeEventListener("load", onLoad);
  }, [src]);
  return img;
}
