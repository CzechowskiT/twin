import React from "react";
import { Composition } from "remotion";

import { FILM_DURATION_SEC, FILM_FPS } from "./copy";
import { ProductFilm } from "./ProductFilm";

export const RemotionRoot: React.FC = () => {
  const durationInFrames = FILM_DURATION_SEC * FILM_FPS;
  return (
    <>
      <Composition
        id="ProductFilmEN"
        component={ProductFilm}
        durationInFrames={durationInFrames}
        fps={FILM_FPS}
        width={1920}
        height={1080}
        defaultProps={{ locale: "en" as const }}
      />
      <Composition
        id="ProductFilmPL"
        component={ProductFilm}
        durationInFrames={durationInFrames}
        fps={FILM_FPS}
        width={1920}
        height={1080}
        defaultProps={{ locale: "pl" as const }}
      />
    </>
  );
};
