/*
* This is the controller for the Events schema.
* author: ayunus@ucsc.edu
*/

// Import
const Events = require('./model');	//events schema
const Organization = require('../Organizations/model');	//organizations schema
const Expenses = require('../Expenses/model');	//Expenses Schema
const mongoose = require('mongoose');	//mongoose, library to communicate with backend
const Img = require('../Images/model');	//image model
const fs = require('fs');	//file system

/*
*	Method to grab all events for an organization. This is used when tapping the events tab.
*/
exports.getEvents = (req, res) => {
	const { organizationID } = req.params;	// grabs id of organization in route URL.
	//Find the orgnaization with id = organizationID and populate it's array of events along with each event's image.
	Organization.findByIdAndUpdate(organizationID).populate({ path: 'events', populate: { path: 'image' } }).then((organization) => {
		if (!organization) {
			return res.status(400).json({ 'Error': 'No events found' });	//organization is null, DNE
		} else {
			return res.status(201).json({ 'events': organization.events, idOfUser: req.user._id }); //returns organization's events along with idOfUser
		}
	}).catch((err) => console.log(err));
};

/*
* Method to add a member to an event. This function is called when you tap the star on the event.
*/
exports.addMemberToEvent = (req, res) => {
	const { eventID } = req.params;	// grabs the eventID from url
	const idOfAttender = req.user._id;	// grabs of id of user from passport instance.
	// Checks if Event exists. If it does, add idOfAttender to the event whose id = evetID's member array
	Events.findByIdAndUpdate(eventID).then((event) => {
		if (event) {
			var currentAttendees = event.going;	//grabs current array of members(id form)
			var isInArray = event.going.some(function (friend) {	//checks if the user is already in event's going array
				return friend.equals(idOfAttender);
			});
			//if user is in array, remove his/her id from the memeber array. Add him if otherwise.
			if (currentAttendees.length != 0 && isInArray) {
				Events.findOneAndUpdate(
					{ _id: eventID },
					{ $pull: { going: mongoose.Types.ObjectId(idOfAttender) } },
					{ new: true, upsert: true },
					function (error, event) {
						if (error) {
							console.log(error);
						} else {
							return res.status(201).json({ event });
						}
					});
			} else {
				Events.findOneAndUpdate(
					{ _id: eventID },
					{ $push: { going: mongoose.Types.ObjectId(idOfAttender) } },
					{ new: true, upsert: true },
					function (error, event) {
						if (error) {
							console.log(error);
						} else {
							return res.status(201).json({ event });
						}
					});
			}
		} else {
			return res.status(400).json({ 'err': 'err' });	//error
		}
	}).catch((err) => console.log(err));
}

/*
* Method to add event. We create an Event via the Event Schema and add it's id to the events array in the organization whose id = organizationID
*/
exports.addEvent = (req, res) => {
	const { organizationID } = req.params;	//grab the idOfOrganization whose id = idOfOrganization
	var { name, date, description, expense } = req.body;	//grab data from req.body
	expense = parseFloat(expense);	//convert expense to floating point
	//Next 4 lines are how to write image info to db. We are going to change this soon. Code is more to memorize
	var new_img = new Img;
	new_img.img.data = fs.readFileSync(req.file.path)
	new_img.img.contentType = 'image/jpeg';
	//Save image
	new_img.save().then((image) => {
		//Find Organization whose id = organizationID
		Organization.findByIdAndUpdate(organizationID).then((organization) => {
			if (!organization) {
				return res.status(400).json({ 'Error': 'No such organization exists' }); //DNE, doesnt exist
			} else {
				//Create clubEvent document and expense document
				let clubEvent = new Events({
					organization: organizationID,
					name: name,
					date: date,
					description: description,
					going: [req.user._id],
					image: image._id
				});
				let expenses = new Expenses({
					idOfClub: organizationID,
					idOfEvent: clubEvent._id,
					amount: expense
				});
				//write expense to db
				expenses.save().then((expense) => {
					if (expense) {
						//write clubEvent to db
						clubEvent.save().then((event) => {
							// Add event's id to organization's events array
							Organization.addEventToClub(organizationID, event._id);
							// Find the Event whose id = event's id and populate it's image
							Events.findOne({ _id: event._id }).populate('image').then((event) => {
								return res.status(201).json({ 'event': event }); //return 201, all good
							}).catch(err => {
								return res.status(400).json({ 'Error': err });
							});
						}).catch((err) => {
							return res.status(400).json({ 'Error': err });
						});
					}
				}).catch((err) => {
					return res.status(400).json({ 'Error': err });
				});

			}
		});
	});
}
