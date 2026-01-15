#!/usr/bin/env bun
import { getChargesCollection, getCollectionStats } from '../lib/ingestion/hospital-prices-db';
import { closeConnection } from '../lib/mongodb';

async function main() {
  const stats = await getCollectionStats();
  console.log('Collection stats:', stats);

  if (stats.charges === 0) {
    console.log('No charges in database');
    return;
  }

  const collection = await getChargesCollection();

  // Count with payer data
  const withPayers = await collection.countDocuments({
    'payerCharges.0': { $exists: true }
  });

  const withMin = await collection.countDocuments({
    minNegotiated: { $ne: null }
  });

  console.log(`Total charges: ${stats.charges}`);
  console.log(`With payer charges: ${withPayers}`);
  console.log(`With min negotiated: ${withMin}`);

  // Get sample with payer data
  const sample = await collection.findOne({
    'payerCharges.0': { $exists: true }
  });

  if (sample) {
    console.log('\nSample with payer data:');
    console.log(JSON.stringify(sample, null, 2).slice(0, 2500));
  }

  // Get one sample without payer data
  const noPayerSample = await collection.findOne({
    'payerCharges': { $size: 0 }
  });

  if (noPayerSample) {
    console.log('\nSample WITHOUT payer data:');
    console.log(JSON.stringify(noPayerSample, null, 2).slice(0, 1500));
  }
}

main()
  .catch(console.error)
  .finally(() => closeConnection());
