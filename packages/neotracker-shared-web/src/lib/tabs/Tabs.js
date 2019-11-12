/* @flow */
import { Link } from 'react-router-dom';
import * as React from 'react';

import classNames from 'classnames';
import { type HOC, compose, pure } from 'recompose';

import { Button, Typography, withStyles } from '../base';

const styles = () => ({
  root: {
    display: 'flex',
  },
  link: {
    textDecoration: 'none',
    height: 37
  },
  btn: {
    height: '37px !important',
    borderRadius: 20
  },
  btnActive: {
    boxShadow: '0 0 0 1px white'
  }
});

type TabType = {
  className?: string,
  id: string,
  label: string,
  selected: boolean,
  onClick?: () => void,
  href?: string,
};
type ExternalProps = {|
  tabs: Array<TabType>,
  className?: string,
|};
type InternalProps = {|
  classes: Object,
|};
type Props = {|
  ...ExternalProps,
  ...InternalProps,
|};
function Tabs({ tabs, className, classes }: Props): React.Element<*> {
  return (
    <div className={classNames(className, classes.root)}>
      {tabs.map((tab) => (
        <Link key={tab.id} className={classes.link} to={tab.href}>
          <Button
            className={classNames(tab.className, classes.btn, tab.selected ? classes.btnActive : null)}
            onClick={tab.onClick}
          >
            <i className={`icon-${tab.id}`}> </i>
            <Typography variant="body1" color="inherit" fontWeight="500">
              {tab.label}
            </Typography>
          </Button>
        </Link>
      ))}
    </div>
  );
}

const enhance: HOC<*, *> = compose(
  withStyles(styles),
  pure,
);

export default (enhance(Tabs): React.ComponentType<ExternalProps>);
