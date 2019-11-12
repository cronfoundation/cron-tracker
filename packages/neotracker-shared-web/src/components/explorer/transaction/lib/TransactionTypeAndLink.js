/* @flow */
import * as React from 'react';
import type { Variant } from '@material-ui/core/Typography';

import classNames from 'classnames';
import { type HOC, compose, pure } from 'recompose';
import { graphql } from 'react-relay';

import { type Theme } from '../../../../styles/createTheme';
import { Icon, Typography, withStyles } from '../../../../lib/base';
import Link from '../../../../lib/link/Link';

import { fragmentContainer } from '../../../../graphql/relay';
import * as routes from '../../../../routes';

import { type TransactionTypeAndLink_transaction } from './__generated__/TransactionTypeAndLink_transaction.graphql';

import getIcon from './getIcon';
import getTitle from './getTitle';

const styles = (theme: Theme) => ({
  root: {
    alignItems: 'center',
    display: 'flex',
    minWidth: '148.63px',
  },
  title: {
    maxWidth: '76.63px',
    width: '76.63px',
    minWidth: '76.63px',
    fontSize: '0.875rem',
    color: '#000',
    fontWeight: '500'
  },
  margin: {
    marginRight: theme.spacing.unit,
  },
  svg: {
    minWidth: 14
  }
});

type ExternalProps = {|
  transaction: any,
  titleComponent?: string,
  titleVariant?: Variant,
  hashComponent?: string,
  hashVariant?: Variant,
  className?: string,
|};
type InternalProps = {|
  transaction: TransactionTypeAndLink_transaction,
  classes: Object,
|};
type Props = {|
  ...ExternalProps,
  ...InternalProps,
|};
function TransactionTypeAndLink({
  transaction,
  titleComponent,
  titleVariant,
  hashComponent,
  hashVariant,
  className,
  classes,
}: Props): React.Element<*> {
  const icon = getIcon((transaction.type: any));
  const title = getTitle((transaction.type: any));
  return (
    <div className={classNames(classes.root, className)}>
      {/*<Icon className={classes.margin}>{icon}</Icon>*/}
      <svg className={classNames(classes.margin, classes.svg)} width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.81018 14.6762C5.62504 14.765 5.41733 14.821 5.20058 14.821C4.40582 14.821 3.76008 14.1531 3.76008 13.3311C3.76008 12.5092 4.40582 11.8413 5.20058 11.8413C5.52571 11.8413 5.81924 11.9534 6.05857 12.1402L6.74945 11.5517C6.33852 11.1688 5.79665 10.9259 5.20058 10.9259C3.91813 10.9259 2.87952 12.0001 2.87952 13.3265C2.87952 14.6529 3.91813 15.7271 5.20058 15.7271C5.61602 15.7271 5.99986 15.6056 6.33854 15.4095L5.81018 14.6762Z" fill="#3CBFEF"/>
        <path d="M7.05198 11.9057L6.37316 12.4846C6.53155 12.7246 6.62206 13.0165 6.62206 13.3271C6.62206 13.7507 6.45463 14.1272 6.18311 14.4002L6.70351 15.1391C7.18773 14.6967 7.50452 14.0519 7.50452 13.3271C7.50452 12.7952 7.33255 12.3058 7.05198 11.9057Z" fill="#3CBFEF"/>
        <path d="M2.87499 4.37501H11V3.50001H2.87499V4.37501Z" fill="#3CBFEF"/>
        <path d="M11 6.87499H2.87499V5.99999H11V6.87499Z" fill="#3CBFEF"/>
        <path d="M2.87499 9.375H11V8.5H2.87499V9.375Z" fill="#3CBFEF"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M13.875 12.8692L13.8692 12.875H13.875L8.75 18V17.9942L8.74416 18H2.7546C1.23327 18 0 16.7637 0 15.2386V2.76136C0 1.23631 1.23327 0 2.7546 0H11.1204C12.6417 0 13.875 1.2363 13.875 2.76136V12.8692ZM2.7546 1.28864H11.1204C11.9318 1.28864 12.5895 1.948 12.5895 2.76136V12.875H11.8665C10.1453 12.875 8.75 14.2737 8.75 15.9992V16.7114H2.7546C1.94322 16.7114 1.28548 16.052 1.28548 15.2386V2.76136C1.28548 1.948 1.94322 1.28864 2.7546 1.28864Z" fill="#3CBFEF"/>
      </svg>
      <Typography
        className={classNames(classes.title, classes.margin)}
        component={titleComponent}
        variant={titleVariant || 'subheading'}
      >
        {title}
      </Typography>
      <Link
        component={hashComponent}
        variant={hashVariant || 'body1'}
        path={routes.makeTransaction(transaction.hash)}
        title={transaction.hash}
      />
    </div>
  );
}

const enhance: HOC<*, *> = compose(
  fragmentContainer({
    transaction: graphql`
      fragment TransactionTypeAndLink_transaction on Transaction {
        type
        hash
      }
    `,
  }),
  withStyles(styles),
  pure,
);

export default (enhance(TransactionTypeAndLink): React.ComponentType<
  ExternalProps,
>);
