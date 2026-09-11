import { scenePalette } from './scenePalette';

export function SceneLights() {
  return (<>
    <ambientLight intensity={0.55} />
    <directionalLight position={[2, 3, 2]} intensity={1.3} color={scenePalette.key} />
    <directionalLight position={[-2, -1, -1]} intensity={0.35} />
    <directionalLight position={[-3, 2, -2]} intensity={0.6} color={scenePalette.rim} />
  </>);
}
