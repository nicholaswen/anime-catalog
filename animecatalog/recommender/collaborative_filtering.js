var mongoose = require('mongoose');
var request = require('request'); 
var Rating_Data = require('../models/user_rating').Rating_Data;
var User_Rating = require('../models/user_rating').User_Rating;
var RatingData = null;

function getRatingData(callback) {
  	if (RatingData != null) callback(RatingData);
  	User_Rating.find({}, function(err, data){
  		RatingData = {};
  		for (var i = 0; i < data.length; i++) {
  			var per_user = data[i];
  			//var user = {username: per_user.username};
  			var anime = {};
  			for (var j = 0; j < per_user.data.length; j++)
  			{
  				var title = per_user.data[j].title; //.replace("'", "");
  				anime[title] = per_user.data[j].rating;
  			}
  			RatingData[per_user.username] = anime;

  		}
  		if (RatingData!=null) callback(RatingData);
  	});
}

function distance_similarity(userdata, user1, user2) {
    var ratings1 = userdata[user1];
    //console.log(ratings1);
    var ratings2 = user2;
    //console.log(ratings2);
    var sum = 0.0;
    for (var title in ratings1) {
    	if (ratings2[title] != null) {
    		var difference = ratings1[title] - ratings2[title];
    		sum += difference*difference;
    	}
    }
    if (sum == 0.0) return 0.0;
    return 1/(1 + sum);
}

function pearson_similarity(userdata, user1, user2) {
	var common_keys = [];
	var ratings1 = userdata[user1];
  var ratings2 = user2;
  for (var title in ratings1) {
    if (ratings2[title] != null) {
      common_keys.push(title);
    }
  }
  //console.log(common_keys);
  if (common_keys.length == 0) return 0;
  var n = common_keys.length;
  var sum1 = 0.0;
  var sum2 = 0.0;
  var sum1Square = 0.0;
  var sum2Square = 0.0;
  var sum12 = 0.0;  
 	common_keys.forEach(function(title){
    var rating1 = ratings1[title];
    var rating2 = ratings2[title]; //Rating passed in as a string
 		sum1 += rating1;
 		sum2 += rating2;
 		sum1Square += rating1*rating1;
 		sum2Square += rating2*rating2;
 		sum12 += rating1 * rating2;
 	});
  var sumtimes = (sum1 * sum2)/n;
  var num = sum12 - (sum1 * sum2 / n);
  //console.log("Num: " + num);
  var den = Math.sqrt((sum1Square - sum1*sum1/n) * (sum2Square - sum2*sum2/n));
  //console.log("Den :" + den);
  if (den == 0.0 ) return 0.0;
  return num/den;
}

function top_matches(userdata, user, username, n, sim_function) {
	if (n == null) n = 5;
	if (sim_function == null) sim_function = pearson_similarity;
	var scores = [];
	for (var myuser in userdata) {
		if (myuser == username) continue;
		var score = sim_function(userdata, myuser, user);
		scores.push({username: myuser, score: Math.round(score*100)/100});
	}
  //console.log("Scores: " + scores);
	scores.sort(function(user1, user2) {return user2.score - user1.score;});
  //console.log("Sorted scores: " + scores);
  //scores = sc;
  for (var i = 0; i < scores.length; i++) {
    console.log(scores[i].username + " : " + scores[i].score);
  }

	return scores.slice(0, n);

}

function recommend(userdata, user, username, n, sim_function) {
	if (n == null) n = 5;
	if (sim_function == null) sim_function = pearson_similarity;
	var totals = {};
  //console.log(user);
	var scoreSums = {};
	for (var myuser in userdata) {
		if (myuser == username) continue;
		var score = sim_function(userdata, myuser, user);
		if (score <= 0) continue;
		for (var anime in userdata[myuser]) {
			if (user[anime] == null) {
				if (totals[anime] == null) totals[anime] = 0.0;
				totals[anime] += userdata[myuser][anime] * score;
				if (scoreSums[anime] == null) scoreSums[anime] = 0.0;
				scoreSums[anime] += score;
			}			
		}
	}
	var rankings = [];
	for (var anime in totals) {
		rankings.push({anime: anime, score: Math.round(totals[anime]/scoreSums[anime]*100)/100});
	}
	rankings.sort(function(anime1, anime2) {return anime2.score - anime1.score;});
  rankings = JSON.stringify(rankings.slice(0, n));
	return rankings.slice(0, n);
}

function process_user(user, username, n, sim_func, res) {
  var data_ob = JSON.parse(user);
  var rating_data = [];
  var user = {};
  for (var i = 0; i < data_ob.length; i++) {
    if (data_ob[i].rating.value != null) {
      var title = data_ob[i].anime.title; //.replace("'", "");
      user[title] = Number(data_ob[i].rating.value);
    }
  }

  getRatingData(function(ratingData) {
    if (sim_func == 1) {
        var matches = top_matches(ratingData, user, username, n, distance_similarity);
        var recomms = recommend(ratingData, user, username, n, distance_similarity);
        res.render('recommendations', { title: 'Recommendations', username:  user.username, n: n, sim_func: sim_func, matches: matches,  recomms: recomms});
    } 
    else {
        var matches = top_matches(ratingData, user, username, n, pearson_similarity);
        var recomms = recommend(ratingData, user, username, n, pearson_similarity);
        console.log("Matches: " + matches);
        console.log("Recommends: " + recomms);
        res.render('recommendations', { title: 'Recommendations', username:  user.username, n: n, sim_func: sim_func, matches: matches,  recomms: recomms});
    }
  });
}

function driver(username, n, sim_func, res) {
  var url = 'http://hummingbird.me/api/v1/users/' + username + '/library';
  request(url, function (error, response, body) {
    //console.log("Status Code: " + response.statusCode);
    if (!error && response.statusCode == 200) {
      var user = body;
      process_user(user, username, n, sim_func, res);
    }
    else if (response.statusCode == 404) {
      var error_message = "Error: " + username +" not found on Hummingbird"
      res.render("recommendations", {error: error_message});
      return;
    }
    else {
      console.log("Error: " + error);
    }
  });
}

module.exports = {
  driver: driver
}