import { Composition } from "remotion";
import { WebBrainLeadsFilm } from "./WebBrainLeadsFilm";

export const RemotionRoot = () => {
  return (
    <Composition
      id="WebBrainLeadsFilm"
      component={WebBrainLeadsFilm}
      durationInFrames={420}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
