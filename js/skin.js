/* The portfolio's design travels into the museum in three depths, picked with
   ?skin=. `grade` is what the room ships with: the cool hang reads as the
   portfolio's own palette rather than as a filter laid over a warm picture.

     hud    — the chrome only. Plates, labels and readout are the portfolio's
              cool panels; the room stays lit warm as it is hung.
     grade  — the chrome, plus the room graded to match it: slate fog and lights
              instead of sunlit plaster, deeper vignette, a cool bias in the
              grade pass in place of the warm one.
     veil   — the chrome and the cool hang, plus the portfolio's own background
              stack (dot grid, accent glow, scanlines) laid around the frame,
              masked clear of the pictures.

   The tone table is read before the scene is built, so a skin is a different
   hang of the room rather than a filter applied to it after the fact. */
const SKIN = ((location.search.match(/[?&]skin=(\w+)/) || [])[1]) || 'grade';
document.body.classList.add('skin-' + SKIN);

const TONE = SKIN === 'hud'
  ? {
      fog: 0x8a8071, fogDensity: 0.0068,
      hemiSky: 0xfff2dd, hemiGround: 0xa8957a, hemiIntensity: 1.5,
      sun: 0xfff2dc, spot: 0xffd9a4, fill: 0xffd8a8,
      exposure: 1.05, cool: 0, vignette: 0.32, grain: 0.013
    }
  : {
      /* the cool hang is the clean one: less dust on the negative, a little more
         light in the upper volume, and a fog that reads as evening air rather
         than as a room that has not been swept */
      fog: 0x39414e, fogDensity: 0.0058,
      hemiSky: 0xe6efff, hemiGround: 0x4a5566, hemiIntensity: 1.4,
      sun: 0xd8e5ff, spot: 0xc9daff, fill: 0xa9c2e8,
      exposure: 1.04, cool: 1, vignette: 0.36, grain: 0.007
    };
