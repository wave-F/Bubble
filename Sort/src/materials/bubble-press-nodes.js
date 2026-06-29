import {
  float,
  normalLocal,
  normalView,
  positionLocal,
  positionViewDirection,
  uniform,
} from "three/tsl";

export function buildBubblePressNodes({
  springUniform,
  contactDirUniform,
  pressDentStrengthUniform,
  pressHitLocalUniform,
  pressCompressAmountUniform,
  pressExpandAmountUniform,
  centerDentDepthUniform,
  centerDentRadiusUniform,
  centerDentPowerUniform,
  centerDentNormalUniform,
  centerDentRoughnessUniform,
  roughnessBaseUniform,
  wobble,
}) {
  const pressAlong = positionLocal.dot(contactDirUniform);
  const pressParallel = contactDirUniform.mul(pressAlong);
  const pressPerpendicular = positionLocal.sub(pressParallel);
  const pressCompress = springUniform.mul(pressCompressAmountUniform).negate().add(1.0);
  const pressExpand = springUniform.mul(pressExpandAmountUniform).add(1.0);
  const volumeDeformed = pressParallel.mul(pressCompress).add(pressPerpendicular.mul(pressExpand));

  const dentActive = pressDentStrengthUniform.greaterThan(float(0.001));

  const hitDelta = positionLocal.sub(pressHitLocalUniform);
  const hitDist = hitDelta.length();
  const dentFalloff = hitDist.div(centerDentRadiusUniform).clamp(0.0, 1.0).oneMinus().pow(centerDentPowerUniform);
  const contactMask = normalLocal.dot(contactDirUniform).max(0.0);
  const dentWeight = dentFalloff.mul(contactMask).mul(pressDentStrengthUniform);
  const dentDisplacement = dentWeight.mul(centerDentDepthUniform).negate();
  const normalOffset = normalLocal.mul(dentDisplacement);

  const positionNode = volumeDeformed.add(normalLocal.mul(wobble)).add(normalOffset);

  const safeHitDist = hitDist.max(0.05);
  const dentNormalDir = hitDelta.div(safeHitDist).negate();
  const nearHitFade = hitDist.sub(0.05).div(0.08).clamp(0.0, 1.0);
  const bentNormal = normalLocal
    .mix(dentNormalDir, dentWeight.mul(centerDentNormalUniform).mul(nearHitFade))
    .normalize();
  const normalNode = dentActive.select(bentNormal, normalLocal);

  const roughnessNode = dentActive.select(
    roughnessBaseUniform.add(dentWeight.mul(centerDentRoughnessUniform)),
    roughnessBaseUniform
  );

  const viewDot = normalView.dot(positionViewDirection.negate()).abs().clamp(0.0, 1.0);
  const fresnelEdge = viewDot.mul(-1.0).add(1.0).pow(2.8);

  return {
    positionNode,
    normalNode,
    roughnessNode,
    fresnelEdge,
    dentWeight,
  };
}