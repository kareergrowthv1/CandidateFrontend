/**
 * ARKit-compatible morph target names for lip sync and expressions.
 * Ready Player Me and many GLB avatars use these blend shape names.
 */
export const MORPH_TARGET_NAMES = {
  jawOpen: 'jawOpen',
  mouthClose: 'mouthClose',
  mouthFunnel: 'mouthFunnel',
  mouthPucker: 'mouthPucker',
  mouthSmileLeft: 'mouthSmileLeft',
  mouthSmileRight: 'mouthSmileRight',
  eyeBlinkLeft: 'eyeBlinkLeft',
  eyeBlinkRight: 'eyeBlinkRight',
};

export const LIP_SYNC_MORPHS = [
  MORPH_TARGET_NAMES.jawOpen,
  MORPH_TARGET_NAMES.mouthClose,
  MORPH_TARGET_NAMES.mouthFunnel,
  MORPH_TARGET_NAMES.mouthPucker,
  MORPH_TARGET_NAMES.mouthSmileLeft,
  MORPH_TARGET_NAMES.mouthSmileRight,
];

export const BLINK_MORPHS = [
  MORPH_TARGET_NAMES.eyeBlinkLeft,
  MORPH_TARGET_NAMES.eyeBlinkRight,
];

export const MORPH_ALIASES = {
  jawOpen: ['jawOpen', 'JawOpen', 'jaw_open'],
  mouthClose: ['mouthClose', 'MouthClose', 'mouth_close'],
  mouthFunnel: ['mouthFunnel', 'MouthFunnel'],
  mouthPucker: ['mouthPucker', 'MouthPucker'],
  mouthSmileLeft: ['mouthSmileLeft', 'MouthSmileLeft', 'mouth_smile_L'],
  mouthSmileRight: ['mouthSmileRight', 'MouthSmileRight', 'mouth_smile_R'],
  eyeBlinkLeft: ['eyeBlinkLeft', 'EyeBlinkLeft', 'eyeBlink_L', 'Eye_Blink_Left'],
  eyeBlinkRight: ['eyeBlinkRight', 'EyeBlinkRight', 'eyeBlink_R', 'Eye_Blink_Right'],
};

export default MORPH_TARGET_NAMES;
