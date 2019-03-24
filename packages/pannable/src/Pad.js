import React from 'react';
import Pannable from './Pannable';
import StyleSheet from './utils/StyleSheet';
import {
  requestAnimationFrame,
  cancelAnimationFrame,
} from './utils/animationFrame';
import {
  getAdjustedContentOffset,
  getAdjustedBounceOffset,
  getAdjustedContentVelocity,
  getDecelerationEndOffset,
  calculateDeceleration,
  calculateRectOffset,
} from './utils/motion';

const DECELERATION_RATE_STRONG = 0.04;
const DECELERATION_RATE_WEAK = 0.004;

export default class Pad extends React.PureComponent {
  static defaultProps = {
    children: null,
    width: 0,
    height: 0,
    contentWidth: 0,
    contentHeight: 0,
    scrollEnabled: true,
    pagingEnabled: false,
    directionalLockEnabled: false,
    alwaysBounceX: true,
    alwaysBounceY: true,
    onScroll: () => {},
    onResize: () => {},
    onContentResize: () => {},
  };

  constructor(props) {
    super(props);

    const {
      width,
      height,
      contentWidth,
      contentHeight,
      onResize,
      onContentResize,
    } = props;
    const size = { width, height };
    const contentSize = { width: contentWidth, height: contentHeight };

    onResize(size);
    onContentResize(contentSize);

    this.state = {
      prevContentOffset: null,
      contentOffset: { x: 0, y: 0 },
      contentVelocity: { x: 0, y: 0 },
      size,
      contentSize,
      dragging: false,
      dragStartOffset: null,
      dragDirection: null,
      decelerating: false,
      decelerationEndOffset: null,
      decelerationRate: DECELERATION_RATE_STRONG,
    };

    this.boundingRef = React.createRef();
    this.contentRef = React.createRef();
  }

  static getDerivedStateFromProps(props, state) {
    const { pagingEnabled } = props;
    const {
      prevContentOffset,
      contentOffset,
      contentVelocity,
      size,
      contentSize,
      dragging,
      decelerating,
      decelerationEndOffset,
      decelerationRate,
    } = state;
    const nextState = {};

    if (prevContentOffset !== contentOffset) {
      let nextDecelerating = decelerating;
      let nextDecelerationRate = decelerationRate;
      let nextDecelerationEndOffset = decelerationEndOffset;

      if (nextDecelerating) {
        const adjustedPrevContentOffset = getAdjustedContentOffset(
          prevContentOffset,
          size,
          contentSize,
          false
        );
        const adjustedContentOffset = getAdjustedContentOffset(
          contentOffset,
          size,
          contentSize,
          false
        );

        if (
          nextDecelerationRate !== DECELERATION_RATE_STRONG &&
          adjustedPrevContentOffset === prevContentOffset &&
          adjustedContentOffset !== contentOffset
        ) {
          nextDecelerationRate = DECELERATION_RATE_STRONG;
          nextDecelerationEndOffset = getDecelerationEndOffset(
            contentOffset,
            contentVelocity,
            size,
            pagingEnabled,
            nextDecelerationRate
          );
        }

        if (
          nextDecelerationEndOffset.x === contentOffset.x &&
          nextDecelerationEndOffset.y === contentOffset.y &&
          contentVelocity.x === 0 &&
          contentVelocity.y === 0
        ) {
          if (adjustedContentOffset !== contentOffset) {
            nextDecelerationRate = DECELERATION_RATE_STRONG;
            nextDecelerationEndOffset = adjustedContentOffset;
          } else {
            nextDecelerating = false;
          }
        }
      }

      nextState.prevContentOffset = contentOffset;

      if (nextDecelerating !== decelerating) {
        nextState.decelerating = nextDecelerating;
      }
      if (nextDecelerationRate !== decelerationRate) {
        nextState.decelerationRate = nextDecelerationRate;
      }
      if (nextDecelerationEndOffset !== decelerationEndOffset) {
        nextState.decelerationEndOffset = nextDecelerationEndOffset;
      }

      props.onScroll({
        contentOffset,
        contentVelocity,
        size,
        contentSize,
        dragging,
        decelerating: nextDecelerating,
      });
    }

    return nextState;
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      width,
      height,
      contentWidth,
      contentHeight,
      pagingEnabled,
      onResize,
      onContentResize,
    } = this.props;

    if (prevProps.width !== width || prevProps.height !== height) {
      const size = { width, height };

      this._setStateWithScroll({ size });
      onResize(size);
    }
    if (
      prevProps.contentWidth !== contentWidth ||
      prevProps.contentHeight !== contentHeight
    ) {
      const contentSize = { width: contentWidth, height: contentHeight };

      this._setStateWithScroll({ contentSize });
      onContentResize(contentSize);
    }
    if (prevProps.pagingEnabled !== pagingEnabled) {
      if (pagingEnabled) {
        this._setStateWithScroll(null);
      }
    }
    if (prevState.contentOffset !== this.state.contentOffset) {
      if (this.state.decelerating) {
        const startTime = new Date().getTime();

        if (this._deceleratingTimer) {
          cancelAnimationFrame(this._deceleratingTimer);
        }

        this._deceleratingTimer = requestAnimationFrame(() => {
          this._deceleratingTimer = undefined;
          this._decelerate(new Date().getTime() - startTime);
        });
      }
    }
  }

  componentWillUnmount() {
    if (this._deceleratingTimer) {
      cancelAnimationFrame(this._deceleratingTimer);
      this._deceleratingTimer = undefined;
    }
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

  isDragging() {
    return this.state.dragging;
  }

  isDecelerating() {
    return this.state.decelerating;
  }

  getVisibleRect() {
    const { contentOffset, size } = this.state;

    return {
      x: -contentOffset.x,
      y: -contentOffset.y,
      width: size.width,
      height: size.height,
    };
  }

  setContentSize(contentSize) {
    this._setStateWithScroll({ contentSize });
    this.props.onContentResize(contentSize);
  }

  scrollToRect({ rect, align = 'auto', animated }) {
    this._setContentOffset(
      ({ contentOffset, size }) =>
        calculateRectOffset(rect, align, contentOffset, size),
      animated
    );
  }

  scrollTo({ offset, animated }) {
    this._setContentOffset(offset, animated);
  }

  _setContentOffset(offset, animated) {
    this.setState((state, props) => {
      if (typeof offset === 'function') {
        offset = offset(state, props);
      }

      const { contentOffset, size, contentSize, dragging } = state;
      const { pagingEnabled } = props;

      if (dragging) {
        return null;
      }

      offset = getAdjustedContentOffset(
        offset,
        size,
        contentSize,
        pagingEnabled
      );

      if (!animated) {
        return {
          contentOffset: offset,
          contentVelocity: { x: 0, y: 0 },
          decelerating: false,
        };
      }

      return {
        contentOffset: { ...contentOffset },
        decelerating: true,
        decelerationEndOffset: offset,
        decelerationRate: DECELERATION_RATE_STRONG,
      };
    });
  }

  _setStateWithScroll(nextState) {
    this.setState((state, props) => {
      const { dragging, contentOffset, size, contentSize } = state;
      const { pagingEnabled } = props;

      if (dragging) {
        return nextState;
      }

      const adjustedContentOffset = getAdjustedContentOffset(
        contentOffset,
        size,
        contentSize,
        pagingEnabled
      );

      if (adjustedContentOffset === contentOffset) {
        return nextState;
      }

      return {
        ...nextState,
        contentOffset: { ...contentOffset },
        decelerating: true,
        decelerationEndOffset: adjustedContentOffset,
        decelerationRate: DECELERATION_RATE_STRONG,
      };
    });
  }

  _decelerate(interval) {
    this.setState(state => {
      const {
        contentOffset,
        contentVelocity,
        decelerating,
        decelerationEndOffset,
        decelerationRate,
      } = state;

      if (!decelerating) {
        return null;
      }

      const { xOffset, yOffset, xVelocity, yVelocity } = calculateDeceleration(
        interval,
        decelerationRate,
        contentVelocity,
        contentOffset,
        decelerationEndOffset
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
        dragging: true,
        dragStartOffset: contentOffset,
        dragDirection,
        decelerating: false,
      };
    });
  };

  _onDragMove = ({ translation, interval }) => {
    this.setState((state, props) => {
      const {
        contentOffset,
        size,
        contentSize,
        dragStartOffset,
        dragDirection,
      } = state;
      const { alwaysBounceX, alwaysBounceY } = props;

      const nextContentOffset = getAdjustedBounceOffset(
        {
          x: dragStartOffset.x + dragDirection.x * translation.x,
          y: dragStartOffset.y + dragDirection.y * translation.y,
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
      const { contentOffset, contentVelocity, size, contentSize } = state;
      const { pagingEnabled } = props;

      let decelerationRate = DECELERATION_RATE_STRONG;
      let nextContentVelocity = getAdjustedContentVelocity(
        contentVelocity,
        size,
        DECELERATION_RATE_STRONG
      );

      if (!pagingEnabled) {
        const adjustedContentOffset = getAdjustedContentOffset(
          contentOffset,
          size,
          contentSize,
          false
        );

        if (adjustedContentOffset === contentOffset) {
          decelerationRate = DECELERATION_RATE_WEAK;
        }
      }

      let decelerationEndOffset = getDecelerationEndOffset(
        contentOffset,
        nextContentVelocity,
        size,
        pagingEnabled,
        decelerationRate
      );

      return {
        contentOffset: { ...contentOffset },
        contentVelocity: nextContentVelocity,
        dragging: false,
        decelerating: true,
        decelerationEndOffset,
        decelerationRate,
      };
    });
  };

  _onDragCancel = () => {
    this.setState((state, props) => {
      const { contentOffset, size, contentSize, dragStartOffset } = state;
      const { pagingEnabled } = props;

      const decelerationEndOffset = getAdjustedContentOffset(
        dragStartOffset,
        size,
        contentSize,
        pagingEnabled
      );

      return {
        contentOffset: { ...contentOffset },
        dragging: false,
        decelerating: true,
        decelerationEndOffset,
        decelerationRate: DECELERATION_RATE_STRONG,
      };
    });
  };

  render() {
    const {
      width,
      height,
      contentWidth,
      contentHeight,
      scrollEnabled,
      pagingEnabled,
      directionalLockEnabled,
      alwaysBounceX,
      alwaysBounceY,
      onScroll,
      onResize,
      onContentResize,
      style,
      children,
      ...boundingProps
    } = this.props;
    const { size, contentSize, contentOffset } = this.state;

    const boundingStyles = StyleSheet.create({
      overflow: 'hidden',
      position: 'relative',
      boxSizing: 'border-box',
      width: size.width,
      height: size.height,
      ...style,
    });
    const contentStyles = StyleSheet.create({
      position: 'relative',
      boxSizing: 'border-box',
      width: contentSize.width,
      height: contentSize.height,
      transformTranslate: [contentOffset.x, contentOffset.y],
    });

    return (
      <Pannable
        {...boundingProps}
        ref={this.boundingRef}
        style={boundingStyles}
        enabled={scrollEnabled}
        onStart={this._onDragStart}
        onMove={this._onDragMove}
        onEnd={this._onDragEnd}
        onCancel={this._onDragCancel}
      >
        <div ref={this.contentRef} style={contentStyles}>
          {typeof children === 'function' ? children(this) : children}
        </div>
      </Pannable>
    );
  }
}
