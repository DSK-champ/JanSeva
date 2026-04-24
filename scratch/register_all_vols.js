const path = require('path');
const backendPath = path.join(__dirname, '../Backend');
const mongoose = require(path.join(backendPath, 'node_modules/mongoose'));
const dotenv = require(path.join(backendPath, 'node_modules/dotenv'));
dotenv.config({ path: path.join(backendPath, '.env') });

// Helper to get models relative to script
const modelPath = (name) => path.join(__dirname, '../Backend/src/models', name);
const Campaign = require(modelPath('Campaign'));
const Volunteer = require(modelPath('Volunteer'));
const CampaignRegistration = require(modelPath('CampaignRegistration'));

async function registerAllVolunteers(campaignTitle = 'new event') {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB via Mongoose');

    // 1. Find the campaign
    let campaign = await Campaign.findOne({ title: new RegExp(campaignTitle, 'i') });
    
    if (!campaign) {
      console.log(`Campaign with title "${campaignTitle}" not found. Finding latest campaign instead...`);
      campaign = await Campaign.findOne({}).sort({ createdAt: -1 });
    }

    if (!campaign) {
      console.log('No campaigns found in database.');
      process.exit(1);
    }

    console.log(`Target Campaign: ${campaign.title} (${campaign._id})`);

    // 2. Find all volunteers
    const volunteers = await Volunteer.find({});
    console.log(`Found ${volunteers.length} volunteers in database.`);

    // 3. Register each volunteer
    let count = 0;
    for (const vol of volunteers) {
      const volunteerId = vol.userId || vol._id;
      
      const existing = await CampaignRegistration.findOne({
        campaignId: campaign._id,
        volunteerId: volunteerId
      });

      if (!existing) {
        await CampaignRegistration.create({
          campaignId: campaign._id,
          volunteerId: volunteerId,
          status: 'registered',
          assignedVillageId: "",
          matchScore: 0.0000001
        });
        count++;
      }
    }

    console.log(`Successfully registered ${count} new volunteers in registrations collection.`);

    // 4. Sync Campaign volunteers array for UI display
    const allRegs = await CampaignRegistration.find({ campaignId: campaign._id }).select('volunteerId');
    const allVolIds = allRegs.map(r => r.volunteerId);
    
    await Campaign.updateOne(
      { _id: campaign._id },
      { $set: { volunteers: allVolIds } }
    );

    console.log(`Successfully synced ${allVolIds.length} volunteers to Campaign document.`);
    console.log('Total volunteers registered now (UI count):', (await Campaign.findById(campaign._id)).volunteers.length);
    
    process.exit(0);
  } catch (error) {
    if (error.errInfo) {
      console.error('Validation Details:', JSON.stringify(error.errInfo.details, null, 2));
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

// Get title from command line or default to "new event"
const titleArg = process.argv[2] || 'new event';
registerAllVolunteers(titleArg);
