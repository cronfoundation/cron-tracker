/* @flow */
import * as React from 'react';

import classNames from 'classnames';
import { type HOC, compose, pure } from 'recompose';
import { withRouter } from 'react-router';

import type { AppOptions } from '../../../AppContext';
import { type Theme } from '../../../styles/createTheme';
import { Typography, withStyles } from '../../../lib/base';

import DonateLink from './DonateLink';
import FacebookIcon from './FacebookIcon';
import SocialLink from './SocialLink';
import TwitterIcon from './TwitterIcon';

import { mapAppOptions } from '../../../utils';

const styles = (theme: Theme) => ({
  [theme.breakpoints.down('sm')]: {
    root: {
      paddingLeft: theme.spacing.unit,
      paddingRight: theme.spacing.unit,
    },
  },
  [theme.breakpoints.up('sm')]: {
    root: {
      paddingLeft: theme.spacing.unit * 2,
      paddingRight: theme.spacing.unit * 2,
    },
  },
  root: {
    background: 'linear-gradient(180deg, #0056BB -22.73%, #0A97DE 130.3%)',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: theme.spacing.unit * 2,
    paddingTop: theme.spacing.unit * 2,
  },
  firstRow: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingLeft: '15px'
    // marginBottom: theme.spacing.unit,
  },
  secondRow: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '90%',
  },
  copyright: {
    color: theme.custom.colors.common.white,
    fontSize: '0.875rem'
  },
  icon: {
    fill: theme.custom.colors.common.white,
    paddingRight: theme.spacing.unit / 2,
  },
});

type ExternalProps = {|
  className?: string,
|};
type InternalProps = {|
  appOptions: AppOptions,
  classes: Object,
|};
type Props = {|
  ...ExternalProps,
  ...InternalProps,
|};
function AppFooter({
  className,
  appOptions,
  classes,
}: Props): React.Element<*> {
  return (
    <div className={`${classNames(className, classes.root)} c-footer`}>
      <div className={classes.firstRow}>
        <Typography className={classes.copyright} variant="caption">
          {`${appOptions.meta.name} © 2019`}
        </Typography>
      </div>
      <ul className="c-footer__link">
        <li><a href="#">Where to buy</a></li>
        <li><a href="#">About CRON</a></li>
        <li><a href="#">Wallet</a></li>
        <li><a href="#">Integration</a></li>
        <li><a href="#">Partnership</a></li>
        <li><a href="#">Team</a></li>
        <li><a href="#">Contact</a></li>
      </ul>
    </div>
  );
}

const enhance: HOC<*, *> = compose(
  withRouter,
  withStyles(styles),
  mapAppOptions,
  pure,
);

export default (enhance(AppFooter): React.ComponentType<ExternalProps>);
