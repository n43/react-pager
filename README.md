# react-pannable

Simulate pan gesture and scroll view for touch devices with [`React`](https://facebook.github.io/react/)

[![npm version](https://img.shields.io/npm/v/react-pannable.svg)](https://www.npmjs.com/package/react-pannable)
![npm license](https://img.shields.io/npm/l/react-pannable.svg?style=flat)

## Getting started

Install `react-pannable` using npm.

```shell
npm install --save react-pannable
```

## Documentation

### Pannable

`Pannable` provides a pan gesture simulation on recent mobile browsers for iOS and Android. It can also be used on mouse-base devices across on all evergreen browsers.

#### Prop Types

| Property    | Type          | Default  | Description                                                                                                                                                   |
| :---------- | :------------ | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| enabled     | boolean       | true     | Indicate whether the gesture listener is enabled. If you change this property to `false` while the gesture is listening, the gesture transitions to `cancel`. |
| shouldStart | boolean\|func | true     | Whether to start gesture listening. : `({ target: HTMLElement }) => void`                                                                                     |
| onStart     | func          | () => {} | Callback invoked when the gesture starts listening.: `(params: PanningParams) => void`                                                                        |
| onMove      | func          | () => {} | Callback invoked when the gesture moves.: `(params: PanningParams) => void`                                                                                   |
| onEnd       | func          | () => {} | Callback invoked when the gesture ended listening.: `(params: PanningParams) => void`                                                                         |
| onCancel    | func          | () => {} | Callback invoked when the gesture cancelled.: `(params: PanningParams) => void`                                                                               |

```js
type Point = { x: number, y: number };
type PanningParams = { translation: Point, velocity: Point, target: HTMLElement };
```

### Pad

`Pad` provides a scrollable content component on which overflow scrollbars are not natively supported. It also provides paging scroll implementation and multiple content layout mode.

## License

[MIT License](./LICENSE)
