/* The codemod rewrote each addon's `export { X }` into `THREE.X = X`, but the
   addons still refer to each other by bare name (EffectComposer -> CopyShader,
   UnrealBloomPass -> LuminosityHighPassShader, OutputPass -> OutputShader).
   Load this after every addon to bridge the two conventions. */
(function () {
  const names = ['CopyShader', 'ShaderPass', 'LuminosityHighPassShader', 'UnrealBloomPass',
    'EffectComposer', 'RenderPass', 'OutputPass', 'FXAAShader', 'Pass', 'FullScreenQuad',
    'OutputShader', 'MaskPass', 'ClearMaskPass'];
  for (const n of names) {
    if (THREE[n] === undefined) throw new Error('addon global missing: ' + n);
    if (typeof window[n] === 'undefined') window[n] = THREE[n];
  }
})();
