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
  [theme.breakpoints.down('sm')]: {
    root: {
      flexDirection: 'column',
      alignItems: 'center'
    },
    footerUl: {
      margin: '15px 0 0 0'
    },
    footerLi: {
      marginRight: 10,
      marginBottom: 10
    }
  },
  [theme.breakpoints.up('md')]: {
    footerUl: {
      margin: '0 0 0 55px'
    },
    footerLi: {
      marginRight: 30
    }
  },
  root: {
    background: 'linear-gradient(180deg, #0056BB -22.73%, #0A97DE 130.3%)',
    display: 'flex',
    flexWrap: 'wrap',
    paddingBottom: 23,
    paddingTop: 23,
  },
  footerUl: {
    padding: 0,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  footerLi: {
    listStyle: 'none',
    fontSize: '0.875rem',
    color: '#fff',
    fontWeight: 500,
    '&:last-child': {
      marginRight: 0
    }
  },
  footerLink: {
    textDecoration: 'none',
    color: 'inherit',
    transition: 'opacity 0.2s ease-out',
    '&:hover': {
      opacity: 0.8
    }
  },
  firstRow: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingLeft: '15px'
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
  const FooterLink = ({href, children, target}) => {
    if (href.substring(0, 4) === "http") {
      target = "_blank";
    }
    return (
      <li className={classes.footerLi}>
        <a
          className={classes.footerLink}
          href={href}
          target={target}
          rel={target ? "noreferrer noopener" : ""}
        >{children}</a>
      </li>
    );
  };
  return (
    <div className={classNames(className, classes.root)}>
      <div className={classes.firstRow}>
        <Typography className={classes.copyright} variant="caption">
          {`${appOptions.meta.name} © 2020`}
        </Typography>
      </div>
      <ul className={classes.footerUl}>
        <FooterLink href="https://bitchange.online/" target="_blank">Where to buy</FooterLink>
        <FooterLink href="https://cryptocean.io/" target="_blank">About CRON</FooterLink>
        <FooterLink href="/wallet">Wallet</FooterLink>
        <FooterLink href="https://github.com/cronfoundation/cron-node" target="_blank">Integration</FooterLink>
        <FooterLink href="https://cryptocean.io#partners">Partnership</FooterLink>
        <FooterLink href="https://cryptocean.io#team" target="_blank">Team</FooterLink>
        <FooterLink href="mailto:support@bitchange.online">Contact</FooterLink>
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
