import React from 'react';
import Pannable from './Pannable';
import GeneralContent from './GeneralContent';
import StyleSheet from './utils/StyleSheet';
import {
  requestAnimationFrame,
  cancelAnimationFrame,
} from './utils/animationFrame';
import {
  getAdjustedContentVelocity,
  getAdjustedContentOffset,
  getAdjustedBounceOffset,
  getDecelerationEndOffset,
  createDeceleration,
  calculateDeceleration,
  calculateRectOffset,
} from './utils/motion';

const DECELERATION_RATE_STRONG = 0.04;
const DECELERATION_RATE_WEAK = 0.004;

export default class Pad extends React.Component {
  static defaultProps = {
    ...Pannable.defaultProps,
    width: 0,
    height: 0,
    pagingEnabled: false,
    directionalLockEnabled: false,
    alwaysBounceX: true,
    alwaysBounceY: true,
    onScroll: () => {},
    onDragStart: () => {},
    onDragEnd: () => {},
    onDecelerationStart: () => {},
    onDecelerationEnd: () => {},
    onContentResize: () => {},
  };

  constructor(props) {
    super(props);

    const { width, height } = props;

    this.state = {
      contentOffset: { x: 0, y: 0 },
      contentVelocity: { x: 0, y: 0 },
      size: { width, height },
      contentSize: { width: 0, height: 0 },
      drag: null,
      deceleration: null,
    };

    this.elemRef = React.createRef();
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      width,
      height,
      pagingEnabled,
      onScroll,
      onDragStart,
      onDragEnd,
      onDecelerationStart,
      onDecelerationEnd,
      onContentResize,
    } = this.props;
    const { contentOffset, contentSize, drag, deceleration } = this.state;

    if (width !== prevProps.width || height !== prevProps.height) {
      this._setStateWithScroll({ size: { width, height } });
    }
    if (pagingEnabled !== prevProps.pagingEnabled) {
      if (pagingEnabled) {
        this._setStateWithScroll(null);
      }
    }
    if (contentOffset !== prevState.contentOffset) {
      onScroll(this._getPadEvent());

      this._adjustContentOffsetIfNeeded();

      if (deceleration) {
        this._requestDecelerationTimer();
      }
    }
    if (contentSize !== prevState.contentSize) {
      onContentResize(contentSize);
    }
    if (drag !== prevState.drag) {
      if (!prevState.drag) {
        onDragStart(this._getPadEvent());
      } else if (!drag) {
        onDragEnd(this._getPadEvent());
      }
    }
    if (deceleration !== prevState.deceleration) {
      if (!prevState.deceleration) {
        onDecelerationStart(this._getPadEvent());
      } else if (!deceleration) {
        onDecelerationEnd(this._getPadEvent());
      }
    }
  }

  componentWillUnmount() {
    this._cancelDecelerationTimer();
  }

  getSize() {
    return this.state.size;
  }
  getContentSize() {
    return this.state.contentSize;
  }
  getContentOffset() {
    return this.state.contentOffset;
  }
  getContentVelocity() {
    return this.state.contentVelocity;
  }
  isDragging() {
    return !!this.state.drag;
  }
  isDecelerating() {
    return !!this.state.deceleration;
  }

  getVisibleRect() {
    return this._getVisibleRect(this.state);
  }

  setContentSize(contentSize) {
    this._setStateWithScroll({ contentSize });
  }

  scrollToRect({ rect, align = 'auto', animated = true }) {
    this._setContentOffset(
      state => calculateRectOffset(rect, this._getVisibleRect(state), align),
      animated
    );
  }

  scrollTo({ offset, animated = true }) {
    this._setContentOffset(offset, animated);
  }

  _getVisibleRect(state) {
    const { contentOffset, size } = state;

    return {
      x: -contentOffset.x,
      y: -contentOffset.y,
      width: size.width,
      height: size.height,
    };
  }

  _getPadEvent() {
    const {
      contentOffset,
      contentVelocity,
      size,
      contentSize,
      drag,
      deceleration,
    } = this.state;

    return {
      contentOffset,
      contentVelocity,
      size,
      contentSize,
      dragging: !!drag,
      decelerating: !!deceleration,
    };
  }

  _setContentOffset(offset, animated) {
    this.setState((state, props) => {
      if (typeof offset === 'function') {
        offset = offset(state, props);
      }

      if (!offset) {
        return null;
      }

      const {
        contentOffset,
        contentVelocity,
        size,
        drag,
        deceleration,
      } = state;
      const { pagingEnabled } = props;
      const nextState = {};

      if (drag || !animated) {
        nextState.contentOffset = offset;

        if (drag) {
          nextState.drag = {
            ...drag,
            startOffset: {
              x: drag.startOffset.x + offset.x - contentOffset.x,
              y: drag.startOffset.y + offset.y - contentOffset.y,
            },
          };
        }
        if (deceleration) {
          nextState.deceleration = createDeceleration(
            offset,
            contentVelocity,
            {
              x: deceleration.endOffset.x + offset.x - contentOffset.x,
              y: deceleration.endOffset.y + offset.y - contentOffset.y,
            },
            deceleration.rate
          );
        }
      } else {
        const decelerationRate = DECELERATION_RATE_STRONG;
        const decelerationEndOffset = getDecelerationEndOffset(
          offset,
          { x: 0, y: 0 },
          size,
          pagingEnabled,
          decelerationRate
        );

        nextState.contentOffset = { ...contentOffset };
        nextState.deceleration = createDeceleration(
          contentOffset,
          contentVelocity,
          decelerationEndOffset,
          decelerationRate
        );
      }

      return nextState;
    });
  }

  _setStateWithScroll(nextState) {
    this.setState((state, props) => {
      const {
        contentOffset,
        contentVelocity,
        size,
        drag,
        deceleration,
      } = state;
      const { pagingEnabled } = props;

      if (drag || deceleration) {
        return nextState;
      }

      const decelerationRate = DECELERATION_RATE_STRONG;
      const decelerationEndOffset = getDecelerationEndOffset(
        contentOffset,
        contentVelocity,
        size,
        pagingEnabled,
        decelerationRate
      );

      return {
        ...nextState,
        contentOffset: { ...contentOffset },
        deceleration: createDeceleration(
          contentOffset,
          contentVelocity,
          decelerationEndOffset,
          decelerationRate
        ),
      };
    });
  }

  _adjustContentOffsetIfNeeded() {
    this.setState((state, props) => {
      const {
        contentOffset,
        contentVelocity,
        size,
        contentSize,
        drag,
        deceleration,
      } = state;
      const { pagingEnabled } = props;

      const validContentOffset =
        contentOffset ===
        getAdjustedContentOffset(contentOffset, size, contentSize, false);

      if (validContentOffset) {
        return null;
      }

      let decelerationRate = DECELERATION_RATE_STRONG;
      let decelerationEndOffset;

      if (deceleration) {
        const validEndOffset =
          deceleration.endOffset ===
          getAdjustedContentOffset(
            deceleration.endOffset,
            size,
            contentSize,
            false
          );

        if (!validEndOffset) {
          if (deceleration.rate !== DECELERATION_RATE_STRONG) {
            decelerationEndOffset = getDecelerationEndOffset(
              contentOffset,
              contentVelocity,
              size,
              pagingEnabled,
              decelerationRate
            );
          } else {
            decelerationEndOffset = deceleration.endOffset;
          }

          decelerationEndOffset = getAdjustedContentOffset(
            decelerationEndOffset,
            size,
            contentSize,
            pagingEnabled
          );
        }
      } else if (!drag) {
        decelerationEndOffset = getAdjustedContentOffset(
          contentOffset,
          size,
          contentSize,
          pagingEnabled
        );
      }

      if (!decelerationEndOffset) {
        return null;
      }

      return {
        contentOffset: { ...contentOffset },
        deceleration: createDeceleration(
          contentOffset,
          contentVelocity,
          decelerationEndOffset,
          decelerationRate
        ),
      };
    });
  }

  _requestDecelerationTimer() {
    if (this._decelerationTimer) {
      cancelAnimationFrame(this._decelerationTimer);
    }

    this._decelerationTimer = requestAnimationFrame(() => {
      this._decelerationTimer = undefined;
      this._decelerate();
    });
  }

  _cancelDecelerationTimer() {
    if (!this._decelerationTimer) {
      return;
    }

    cancelAnimationFrame(this._decelerationTimer);
    this._decelerationTimer = undefined;
  }

  _decelerate() {
    this.setState(state => {
      const { deceleration } = state;

      if (!deceleration) {
        return null;
      }

      const moveTime = new Date().getTime();

      if (deceleration.startTime + deceleration.duration <= moveTime) {
        return {
          contentOffset: deceleration.endOffset,
          contentVelocity: { x: 0, y: 0 },
          deceleration: null,
        };
      }

      const { xOffset, yOffset, xVelocity, yVelocity } = calculateDeceleration(
        deceleration,
        moveTime
      );

      return {
        contentOffset: { x: xOffset, y: yOffset },
        contentVelocity: { x: xVelocity, y: yVelocity },
      };
    });
  }

  _onDragStart = ({ velocity }) => {
    this.setState((state, props) => {
      const { contentOffset } = state;
      const { directionalLockEnabled } = props;

      const dragDirection = !directionalLockEnabled
        ? { x: 1, y: 1 }
        : Math.abs(velocity.x) > Math.abs(velocity.y)
        ? { x: 1, y: 0 }
        : { x: 0, y: 1 };
      const contentVelocity = {
        x: dragDirection.x * velocity.x,
        y: dragDirection.y * velocity.y,
      };

      return {
        contentOffset: { ...contentOffset },
        contentVelocity,
        drag: {
          direction: dragDirection,
          startOffset: contentOffset,
        },
        deceleration: null,
      };
    });
  };

  _onDragMove = ({ translation, interval }) => {
    this.setState((state, props) => {
      const { contentOffset, size, contentSize, drag } = state;
      const { alwaysBounceX, alwaysBounceY } = props;

      const nextContentOffset = getAdjustedBounceOffset(
        {
          x: drag.startOffset.x + drag.direction.x * translation.x,
          y: drag.startOffset.y + drag.direction.y * translation.y,
        },
        { x: alwaysBounceX, y: alwaysBounceY },
        size,
        contentSize
      );
      const contentVelocity = {
        x: (nextContentOffset.x - contentOffset.x) / interval,
        y: (nextContentOffset.y - contentOffset.y) / interval,
      };
      return { contentOffset: nextContentOffset, contentVelocity };
    });
  };

  _onDragEnd = () => {
    this.setState((state, props) => {
      const { contentOffset, contentVelocity, size } = state;
      const { pagingEnabled } = props;

      const nextContentVelocity = getAdjustedContentVelocity(
        contentVelocity,
        size,
        DECELERATION_RATE_STRONG
      );
      const decelerationRate = pagingEnabled
        ? DECELERATION_RATE_STRONG
        : DECELERATION_RATE_WEAK;
      const decelerationEndOffset = getDecelerationEndOffset(
        contentOffset,
        nextContentVelocity,
        size,
        pagingEnabled,
        decelerationRate
      );

      return {
        contentOffset: { ...contentOffset },
        contentVelocity: nextContentVelocity,
        drag: null,
        deceleration: createDeceleration(
          contentOffset,
          nextContentVelocity,
          decelerationEndOffset,
          decelerationRate
        ),
      };
    });
  };

  _onDragCancel = () => {
    this.setState((state, props) => {
      const { contentOffset, contentVelocity, size, drag } = state;
      const { pagingEnabled } = props;

      const decelerationEndOffset = getDecelerationEndOffset(
        drag.startOffset,
        { x: 0, y: 0 },
        size,
        pagingEnabled,
        DECELERATION_RATE_STRONG
      );

      return {
        contentOffset: { ...contentOffset },
        drag: null,
        deceleration: createDeceleration(
          contentOffset,
          contentVelocity,
          decelerationEndOffset,
          DECELERATION_RATE_STRONG
        ),
      };
    });
  };

  render() {
    const {
      width,
      height,
      pagingEnabled,
      directionalLockEnabled,
      alwaysBounceX,
      alwaysBounceY,
      onScroll,
      onDragStart,
      onDragEnd,
      onDecelerationStart,
      onDecelerationEnd,
      onContentResize,
      ...props
    } = this.props;
    const { size, contentSize, contentOffset } = this.state;

    let element = props.children;

    if (typeof element === 'function') {
      element = element(this);
    }
    if (!React.isValidElement(element) || !element.props.connectWithPad) {
      element = <GeneralContent>{element}</GeneralContent>;
    }

    const onElemResize = element.props.onResize;
    const elemProps = {
      ref: element.ref,
      style: StyleSheet.create({
        position: 'relative',
        width: contentSize.width,
        height: contentSize.height,
        transformTranslate: [contentOffset.x, contentOffset.y],
        ...element.props.style,
      }),
      visibleRect: this.getVisibleRect(),
      onResize: contentSize => {
        this._setStateWithScroll({ contentSize });
        onElemResize(contentSize);
      },
    };

    element = React.cloneElement(element, elemProps);

    props.children = element;
    props.onStart = this._onDragStart;
    props.onMove = this._onDragMove;
    props.onEnd = this._onDragEnd;
    props.onCancel = this._onDragCancel;
    props.style = {
      overflow: 'hidden',
      position: 'relative',
      width: size.width,
      height: size.height,
      ...props.style,
    };

    return <Pannable {...props} ref={this.elemRef} />;
  }
}
