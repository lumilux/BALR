require 'rubygems'
require 'sinatra'
require 'sinatra/redis'
require 'bcrypt'

set :redis, 'redis://localhost:6379/0'
set :path, 'http://localhost:4567'

enable :sessions

get '/' do
	checkAuth()

	@title = 'Home'
	erb :index
end

get '/signup' do
	checkAuth()

	@title = 'Sign Up'

	@failed_login = params[:redirected]
	erb :signup
end

get '/login' do
	checkAuth()

	@title = 'Log in'

	@failed_login = params[:failed]
	erb :login
end

get '/logout' do
	session[:auth] = false

	@title = 'Logged Out'

	erb :logout
end

# TODO: homescreen will show score, badges, and contributed links
get '/home' do
	if not session[:auth]
		redirect '/login'
	end
	
	@title = 'Your Homepage'

	erb :home
end

get '/user/:username' do
	@username = params[:username]
	@title = 'Overview for '+@username

	# get list of this user's contributed links
	@user_contributions = {}
	@user_deadlinks = redis.lrange('contributions:'+@username, 0, -1)
	@user_deadlinks.each { |deadlink|
		@user_contributions[deadlink] = [] # array of hashes: [{altlink, score}, {altlink, score}, ... ]
		@alt_links = redis.lrange('contributions:'+@username+':'+deadlink, 0, -1)
		@alt_links.each { |altlink|
			@altlink_score = redis.hget('alts:'+deadlink, altlink)
			@user_contributions[deadlink].push( {'alt' => altlink, 'score' => @altlink_score} )
		}
	}

	puts @user_contributions.inspect

	erb :user_overview
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
			session[:auth] = true
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

def checkAuth()
	if session[:auth]
		redirect '/home'
	end
end
