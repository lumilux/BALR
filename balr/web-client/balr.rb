require 'rubygems'
require 'sinatra'
require 'sinatra/redis'
require 'bcrypt'

set :redis, 'redis://localhost:6379/0'
set :path, 'http://localhost:4567'

get '/' do
	@title = 'Home'
	erb :index
end

get '/signup' do
	@title = 'Sign Up'
	erb :signup
end

post '/new/user' do
	@username = params[:username].to_s
	@password = (BCrypt::Password.create params[:password]).to_s

	# does this user already exist?
	puts redis.hlen(@username)
	if redis.hlen(@username) == 0

		# create new user in user_list
		redis.rpush 'users_list', @username

		# create hew user hash
		redis.hmset @username, 'username', @username, 'password', @password, 'score', 0

		'true'
	else
		'false'
	end
end