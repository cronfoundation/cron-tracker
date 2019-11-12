/* @flow */
import type { IconProps } from '@material-ui/core/Icon';
import * as React from 'react';

import classNames from 'classnames';
import { compose, hoistStatics, pure } from 'recompose';

import { withStyles } from '../base';

const styles = (theme: any) => ({
  chevron: {
    cursor: 'pointer',
    transition: theme.transitions.create(['transform']),
  },
  chevronUp: {
    transform: 'rotate(0deg)',
  },
  chevronDown: {
    transform: 'rotate(180deg)',
  },
});

type ExternalProps = {|
  ...IconProps,
  up: boolean,
  className?: string,
|};
type InternalProps = {|
  classes: Object,
|};
type Props = {
  ...ExternalProps,
  ...InternalProps,
};
function Chevron({
  up,
  className,
  classes,
  ...otherProps
}: Props): React.Element<*> {
  return (
    <i
      className={classNames(
        {
          [classes.chevron]: true,
          [classes.chevronUp]: up,
          [classes.chevronDown]: !up,
        },
        className,
      )}
    >
      <svg width="15" height="8" viewBox="0 0 15 8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 1L7.5 7L1 1H13.5938" stroke="#3CBFEF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </i>
  );
}

export default (hoistStatics(
  compose(
    withStyles(styles),
    pure,
  ),
)(Chevron): React.ComponentType<ExternalProps>);
