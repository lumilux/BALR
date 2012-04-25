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

	@failed_login = params[:redirected]
	erb :signup
end

get '/login' do
	@title = 'Log in'

	@failed_login = params[:failed]
	erb :login
end

get '/home' do
	@title = 'Your Homepage'

	erb :home
end

post '/login' do
	@title = 'Logging in...'
	@username = params[:username].to_s
	@password = params[:password].to_s

	# check to see if this user exists and redirect if so
	@r_hash_name = 'users:'+@username
	if redis.hlen(@r_hash_name) > 0
		@hashed_pass = redis.hget @r_hash_name, 'password'
		@bcrypt_pass = BCrypt::Password.new @hashed_pass
		
		if @bcrypt_pass == @password
			redirect '/home'
		else
			redirect '/login?failed=1'
		end
	else
		redirect '/signup?redirected=1'
	end
end

post '/new/user' do
	@username = params[:username].to_s
	@password = (BCrypt::Password.create params[:password].to_s)

	puts 'original param pw is '+params[:password]

	# does this user already exist?
	@r_hash_name = 'users:'+@username

	puts redis.hlen(@r_hash_name)
	if redis.hlen(@r_hash_name) == 0

		# create new user in user_list
		redis.rpush 'users', @username

		# create hew user hash
		redis.hmset @r_hash_name, 'password', @password, 'score', 0

		puts 'creating new user!'
		puts @password

		'true'
	else
		'false'
	end
end