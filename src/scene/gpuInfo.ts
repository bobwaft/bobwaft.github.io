/** The GPU the browser reports (unmasked when allowed), or null. */
export function gpuName(gl: WebGL2RenderingContext): string | null {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const name: unknown = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  return typeof name === 'string' ? name : null;
}
