export function getAdjustedContentOffset(offset, size, cSize, name) {
  if (name) {
    return Math.max(Math.min(size - cSize, 0), Math.min(offset, 0));
  }

  return {
    x: getAdjustedContentOffset(offset.x, size.width, cSize.width, 'x'),
    y: getAdjustedContentOffset(offset.y, size.height, cSize.height, 'y'),
  };
}

export function getAdjustedPagingOffset(offset, size, name) {
  if (name) {
    return size ? size * Math.round(offset / size) : 0;
  }

  return {
    x: getAdjustedPagingOffset(offset.x, size.width, 'x'),
    y: getAdjustedPagingOffset(offset.y, size.height, 'y'),
  };
}

function getAcc(rate, { x, y }) {
  const r = Math.sqrt(x * x + y * y);

  return { x: rate * (x / r), y: rate * (y / r) };
}

export function getAdjustedPagingVelocity(velocity, size, acc, name) {
  if (name) {
    if (!acc) {
      return 0;
    }

    const redirect = acc > 0 ? 1 : -1;

    return (
      redirect * Math.min(Math.abs(velocity), Math.sqrt(redirect * acc * size))
    );
  }

  acc = getAcc(acc, velocity);

  return {
    x: getAdjustedPagingVelocity(velocity.x, size.width, acc.x, 'x'),
    y: getAdjustedPagingVelocity(velocity.y, size.height, acc.y, 'y'),
  };
}

export function getDecelerationEndPosition(offset, velocity, acc, name) {
  if (name) {
    if (!acc) {
      return offset;
    }

    return offset + 0.5 * velocity * (velocity / acc);
  }

  acc = getAcc(acc, velocity);

  return {
    x: getDecelerationEndPosition(offset.x, velocity.x, acc.x, 'x'),
    y: getDecelerationEndPosition(offset.y, velocity.y, acc.y, 'y'),
  };
}

export function calculateDeceleration(
  interval,
  acc,
  offset,
  velocity,
  offsetEnd,
  name
) {
  if (name) {
    if (!acc) {
      return { offset: offsetEnd, velocity: 0 };
    }

    const dist = offsetEnd - offset;
    const redirect = acc > 0 ? 1 : -1;

    const velocityH =
      redirect * Math.sqrt(0.5 * velocity * velocity + acc * dist);
    const timeH = acc ? (velocityH - velocity) / acc : 0;
    const time = acc ? (2 * velocityH - velocity) / acc : 0;

    if (time < interval) {
      return { offset: offsetEnd, velocity: 0 };
    }

    return {
      offset:
        offset +
        0.5 * (velocity + velocityH) * timeH -
        0.5 *
          (2 * velocityH - acc * Math.abs(timeH - interval)) *
          (timeH - interval),
      velocity: velocityH - acc * Math.abs(timeH - interval),
    };
  }

  acc = getAcc(acc, { x: offsetEnd.x - offset.x, y: offsetEnd.y - offset.y });

  const nextX = calculateDeceleration(
    interval,
    acc.x,
    offset.x,
    velocity.x,
    offsetEnd.x,
    'x'
  );
  const nextY = calculateDeceleration(
    interval,
    acc.y,
    offset.y,
    velocity.y,
    offsetEnd.y,
    'y'
  );

  return {
    offset: { x: nextX.offset, y: nextY.offset },
    velocity: { x: nextX.velocity, y: nextY.velocity },
  };
}