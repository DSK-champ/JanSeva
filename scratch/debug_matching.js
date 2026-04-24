const mongoose = require('../Backend/node_modules/mongoose');
const path = require('path');
const backendPath = path.join(__dirname, '../Backend');
require(path.join(backendPath, 'node_modules/dotenv')).config({ path: path.join(backendPath, '.env') });

async function debugMatching() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    const campaign = await db.collection('campaigns').findOne({ title: 'new event' });
    console.log('Campaign Title:', campaign.title);
    console.log('Campaign Category:', campaign.category);
    console.log('Campaign targetAmount:', campaign.targetAmount);

    const vScores = await db.collection('villageScores').find({ campaignId: campaign._id }).toArray();
    console.log('Village Scores Count:', vScores.length);
    
    let totalCampaignVuln = 0;
    vScores.forEach(v => {
        console.log(`Village: ${v.villageName}, Score: ${v.overallVulnerabilityScore}`);
        totalCampaignVuln += (v.overallVulnerabilityScore || 0);
    });
    console.log('Total Campaign Vuln:', totalCampaignVuln);

    const campaignBudget = campaign.targetAmount || 0;
    console.log('Campaign Budget:', campaignBudget);

    // Simulate domain splitting
    const groups = { food: [], medical: [], education: [], shelter: [] };
    for (const v of vScores) {
      const domScores = {
        food: v.foodScore || 0, medical: v.healthScore || 0,
        education: v.educationScore || 0, shelter: v.shelterScore || 0
      };
      const primary = Object.entries(domScores).sort((a, b) => b[1] - a[1])[0][0];
      groups[primary].push(v);
    }

    for (const [domain, villages] of Object.entries(groups)) {
      if (!villages.length) continue;
      const domainVuln = villages.reduce((s, v) => s + (v.overallVulnerabilityScore || 0), 0);
      const domainBudget = totalCampaignVuln > 0 ? (domainVuln / totalCampaignVuln) * campaignBudget : campaignBudget / 4;
      console.log(`Domain: ${domain}, Villages: ${villages.length}, DomainVuln: ${domainVuln}, DomainBudget: ${domainBudget}`);
      
      for (const village of villages) {
          const prop = domainVuln > 0 ? (village.overallVulnerabilityScore || 0) / domainVuln : 1 / villages.length;
          const funds = Math.round(prop * domainBudget);
          console.log(`  -> Village: ${village.villageName}, Prop: ${prop}, Funds: ${funds}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

debugMatching();
