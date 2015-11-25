var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    URLSlugs = require('mongoose-url-slugs'),
    ObjectId = Schema.ObjectId;

var Anime_User_Rating = require('./anime_user_rating').Anime_User_Rating;

var Anime = new Schema({
    id: ObjectId,
    title: String,
    aliases: [String],
    genre: [String],
    year: Number,
    tags: [String],
    status: String,
    episodes: Number,
    average_rating: Number,
    user_ratings: [Anime_User_Rating],
    synopsis: String,
    created_at: Date,
    updated_at: Date
});

var Anime = mongoose.model('Anime', Anime);
module.exports = {
    Anime: Anime
}