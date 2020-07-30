#!/Users/cmalven/.nvm/versions/node/v10.13.0/bin/node
const bitbar = require('bitbar');
const fetch = require('node-fetch');
const { DateTime } = require('luxon');

const STATE = 'IA';
const CURRENT_API_URL = `https://covidtracking.com/api/states`;
const DAILY_API_URL = `https://covidtracking.com/api/states/daily`;

let stateStats = null;

(async function() {
  const current = await getCurrent();
  const daily = await getDaily();

  const data = await prepData(current, daily);

  await output(data);
})();

async function getCurrent() {
  const data = await fetch(CURRENT_API_URL);
  const res = await data.json();
  const stateData = res.find(data => data.state === STATE);
  return stateData;
}

async function getDaily() {
  const data = await fetch(DAILY_API_URL);
  const res = await data.json();
  const stateData = res.filter(data => data.state === STATE);
  return stateData;
}

async function prepData(current, daily) {
  // Sort data points by how close they are to doubled
  const sortedDataPoints = daily.sort((a, b) => {
    const diffA = Math.abs((current.positive / 2) - a.positive);
    const diffB = Math.abs((current.positive / 2) - b.positive);
    return diffA < diffB ? -1 : 1;
  });

  // Grab the datapoint that is closed to doubled
  const doubledDatapoint = sortedDataPoints[0];

  // Get the overshoot/undershoot in doubling between these times to get a better calculation
  const offDoublingDecimal = (doubledDatapoint.positive * 2) / current.positive;

  // Find the difference in days taken for doubling
  const doubledDatapointDate = DateTime.fromISO(doubledDatapoint.dateChecked);
  const doubleDayDiff = DateTime.local().diff(doubledDatapointDate).as('days') * offDoublingDecimal;

  return {
    current: current,
    daily: {
      doublingDays: doubleDayDiff
    }
  }
}

async function output(data) {
  bitbar([
    {
      text: `:mask: ${data.current.positive}  :skull: ${data.current.death ? data.current.death : '–'}  :heavy_multiplication_x: ${data.daily.doublingDays.toFixed(1)} days`,
      color: 'black',
      dropdown: false
    }
  ]);
}
