/*
* This is the controller for the Organizations schema.
* author: ayunus@ucsc.edu
*/

const Organization = require('./model');
const User = require('../Users/model');
const Conversation = require('../Conversations/model');
const Img = require('../Images/model');
const fs = require('fs');

exports.getUserClubs = (req, res) => {
	console.log(req.user._id);
	User.findOne({ _id: req.user._id }).populate({path : 'arrayClubsAdmin', populate : {path : 'imageId'}}).then((user) => {
		console.log(req.body._id);
		return res.status(201).json({ 'user': user });	//populates array that user is admin of
	}).catch((err) => console.log(err));
};

// Display all the clubs in our Mongo Collection
exports.getAllClubs = (req, res) => {
	Organization.find().then((organizations) => {
		if (!organizations) {
			return res.status(400).json({ 'Error': 'No organizations found' });
		} else {
			return res.status(201).json({ 'organizations': organizations });
		}
	});
};

// dummy method for adding members
exports.addMember = (req, res) => {
	const { idOfOrganization, idOfMember } = req.params;
	// finds and return organization id of specific club
	Organization.findOne({ _id: idOfOrganization }).then((organization) => {
		console.log(organization)
		if (!organization) {
			return res.status(400).json({ 'Error': 'No organizations found' });
		} else {
			Organization.addMemberToClub(idOfOrganization, idOfMember);
			return res.status(201).json({ 'organization': organization });
		}
	});
}

exports.isMember = (req, res) => {
	const { orgID } = req.body;
	const userID = req.user._id;

	Organization.findByIdAndUpdate(orgID).then((organization) => {
		if(!organization)
			return res.status(400).json({ 'Error': 'No organization found' })
		const isMember = organization.members.indexOf(userID) != -1 || organization.admins.indexOf(userID) != -1;
		return res.status(201).json({ 'isMember': isMember });
	});
}

exports.deleteClubMember = (req, res) => {
	const { idOfOrganization, idOfMember } = req.params;

	// finds and return organization id of specific club
	Organization.findOne({ _id: idOfOrganization }).then((organization) => {
		console.log(organization)
		if (!organization) {
			return res.status(400).json({ 'Error': 'No organizations found' });
		} else {
			Organization.deleteClubMember(idOfOrganization, idOfMember);
			return res.status(201).json({ 'organization': organization });
		}
	});
}

exports.getMembers = (req, res) => {
	// Destruct req body ( pull the values to the assign keys)
	const { idOfOrganization } = req.params;
	// finds and return organization id of specific club
	Organization.findOne({ _id: idOfOrganization }).populate('members').then((organization) => {
		if (!organization) {
			return res.status(400).json({ 'Error': 'No organizations found' });
		} else {
			return res.status(201).json({ 'organization': organization });
		}
	});
}

exports.addOrg = (req, res) => {
	// Code to add a new organization to the Mongo Collection

	// Destruct req body
	const { name, acronym, purpose, description } = req.body;
	User.findByIdAndUpdate(req.user._id).then((user) => {
		const president = user.name;

		// Check if organization with these key-value pairs already exists
		if (name && acronym && purpose && description) {
			Organization.findOne({ name: name }).then((organization) => {
				if (organization) {
					return res.status(400).json({ 'Error': 'Organization already exists' });
				} else {

					var new_img = new Img;
					var id;
			    console.log(req.file);
			    new_img.img.data = fs.readFileSync(req.file.path)
			    new_img.img.contentType = 'image/jpeg';
			    new_img.save().then((image) => {
						console.log('jj', image._id);
						// Make new organization and save into the Organizations Collection
						let newOrg = new Organization({
							name: name,
							president: president,
							acronym: acronym,
							admins: [],
							purpose: purpose,
							description: description,
							imageId: image._id
						});
						let chatRoom = new Conversation({
							idOfClub: newOrg._id
						});

						newOrg.save().then((organization) => {
							console.log('hee ', organization);
							User.clubAdminPushing(req.user._id, organization);
							Organization.addAdminToClub(organization._id, req.user._id);
							Organization.addMemberToClub(organization._id, req.user._id);
							chatRoom.save().then((chatRoom) => {
								if (organization && chatRoom) {
									Organization.findOne({ _id: organization._id }).populate('imageId').then((newOrganization) => {
										if (!newOrganization) {
											return res.status(400).json({ 'Error': 'No organizations found' });
										} else {
											return res.status(201).json({ 'organization': newOrganization });
										}
									});
								}
							});
						}).catch((err) => { console.log(err); return res.status(400).json({ 'Error': err }) });
					}).catch((err) => {
						console.log(err);
					});
					 // Push the new user onto the db if successful, else display error
				}
			}).catch(err => console.log(err));
		}
		else {
			return res.status(400).json({ 'Error': 'Error' });
		}
	});
};
