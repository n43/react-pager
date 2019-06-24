# \<Player />

`Player` component used to manage the playback of the paging content.

## Usage

```js
import React from 'react';
import { Player, GridContent } from 'react-pannable';

class Page extends React.Component {
  render() {
    return (
      <Player
        width={300}
        height={400}
        direction="x"
        loop={true}
        autoplayEnabled={true}
      >
        <GridContent
          width={300}
          height={400}
          direction="x"
          itemWidth={300}
          itemHeight={400}
          itemCount={3}
          renderItem={({ itemIndex }) => {
            const style = {
              backgroundColor: itemIndex % 2 ? '#defdff' : '#cbf1ff',
            };

            return <div style={style} />;
          }}
        />
      </Player>
    );
  }
}
```

[![Try it on CodePen](https://img.shields.io/badge/CodePen-Run-blue.svg?logo=CodePen)](https://codepen.io/cztflove/pen/qwvNLp)

## Props

... [`Pad`](pad.md) props

#### `direction`?: 'x' | 'y'

The scroll direction of the player. The default value is `x`.

#### `autoplayEnabled`?: boolean

Determines whether the player should automatically playback. The default value is `true`

#### `autoplayInterval`?: number

Delay between transitions (in ms). The default value is `5000`

#### `loop`?: boolean

Determines whether the player should loop indefinitely. The default value is `true`

#### `goTo`?: { prev?: boolean, next?: boolean index?: number, animated: boolean }

Seeks to the previous page or the next page or the specified page.
