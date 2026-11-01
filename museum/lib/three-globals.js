/* The vendored addons were ESM; the codemod dropped their `import { … } from 'three'`
   headers, so rebind those bare identifiers to the global THREE namespace here. */
(function () {
  const T = THREE;
  const names = [
    'Clock', 'Color', 'ColorManagement', 'Matrix4', 'Plane', 'RawShaderMaterial',
    'ShaderMaterial', 'UniformsUtils', 'Vector2', 'Vector3', 'Vector4',
    'WebGLRenderTarget', 'HalfFloatType', 'NoBlending', 'AdditiveBlending',
    'Mesh', 'MeshBasicMaterial', 'PerspectiveCamera', 'OrthographicCamera',
    'PlaneGeometry', 'LinearFilter', 'SRGBTransfer',
    'NoToneMapping', 'LinearToneMapping', 'ReinhardToneMapping',
    'CineonToneMapping', 'ACESFilmicToneMapping', 'AgXToneMapping'
  ];
  for (const n of names) {
    if (T[n] === undefined) throw new Error('three.js global build is missing ' + n);
    window[n] = T[n];
  }
})();
