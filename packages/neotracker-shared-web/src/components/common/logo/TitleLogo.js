/* @flow */
import * as React from 'react';

import { type HOC, compose, pure } from 'recompose';

type ExternalProps = {|
  id: string,
|};
type InternalProps = {||};
type Props = {|
  ...ExternalProps,
  ...InternalProps,
|};
function TitleLogo({ id }: Props): React.Element<*> {
  const a = `${id}a`;
  const b = `${id}b`;
  return (
    <>
      <svg width="50" height="40" viewBox="0 0 50 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.35852 6.20875L6.38048 6.23066C2.87492 9.71789 0.691629 14.5413 0.674057 19.8729C0.656486 25.2046 2.80024 30.0455 6.28384 33.559L6.24869 33.5853C9.74986 37.1076 14.5953 39.2849 19.959 39.3068C19.9722 39.3068 19.981 39.3068 19.9854 39.3068C19.9986 39.3068 20.0074 39.3068 20.0118 39.3068C24.3081 39.3244 28.2837 37.9444 31.5037 35.6006L26.3332 30.5187C24.4794 31.6227 22.3181 32.2667 20.0074 32.2667C13.2027 32.2228 7.70715 26.6985 7.7335 19.8992C7.75547 13.1 13.295 7.61504 20.1084 7.61942C22.6036 7.63694 24.9143 8.39485 26.8472 9.67408L31.8859 4.57027C28.6351 2.08189 24.5716 0.587989 20.1567 0.570465C20.1436 0.570465 20.1348 0.570465 20.1304 0.570465C20.1172 0.570465 20.1084 0.570465 20.104 0.570465C20.0821 0.570465 20.0601 0.570465 20.0337 0.570465C14.7007 0.570465 9.87287 2.72589 6.35852 6.20875Z" fill="white"/>
        <path d="M31.3939 15.0846C32.0396 16.5872 32.3999 18.2432 32.3955 19.9825C32.3911 21.9101 31.9254 23.7238 31.1303 25.3491L36.3315 30.4705C38.2908 27.4608 39.4374 23.8771 39.4549 20.0219C39.4681 16.2893 38.4182 12.8021 36.5907 9.83618L31.3939 15.0846Z" fill="white"/>
      </svg>
      <svg
        width="145px"
        height="28px"
        viewBox="0 0 145 28"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="[title]"
        className="logo-svg"
      >
        <title id={`${id}Title`}>CRON Tracker Blockchain Explorer & Wallet</title>
        <desc id={`${id}Description`}>
          CRON Tracker Blockchain Explorer & Wallet
        </desc>
        <defs>
          <linearGradient
            x1="45.734%"
            y1="-4.797%"
            x2="45.392%"
            y2="144.834%"
            id={a}
          >
            <stop stopColor="#58BE23" offset="0%" />
            <stop stopColor="#58BE23" stopOpacity="0" offset="100%" />
          </linearGradient>
          <linearGradient
            x1="40.502%"
            y1="1.637%"
            x2="44.803%"
            y2="114.732%"
            id={b}
          >
            <stop stopColor="#58BE23" offset="0%" />
            <stop stopColor="#58BE23" stopOpacity="0" offset="100%" />
          </linearGradient>
        </defs>
          <text
            fontSize="20"
            fontWeight="700"
            fontFamily="Gotham Pro"
            y="15"
          >
            <tspan fill="#fff">
              CRON&nbsp;
            </tspan>
            <tspan fill="#3CBFEF">
              Tracker
            </tspan>
          </text>
      </svg>
    </>
  );
}

const enhance: HOC<*, *> = compose(pure);

export default (enhance(TitleLogo): React.ComponentType<ExternalProps>);
