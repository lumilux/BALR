require 'rubygems'
require 'sinatra'
require 'sinatra/redis'
require 'bcrypt'

set :redis, 'redis://qupt.net:6379/4'
set :path, 'http://localhost:4567'

enable :sessions

get '/' do
	checkAuth()

	@title = 'Home'
	@active = 'home'

	erb :index
end

get '/signup' do
	checkAuth()

	@title = 'Sign Up'
	@active = 'signup'

	@failed_login = params[:redirected]
	erb :signup
end

get '/login' do
	checkAuth()

	@title = 'Log in'
	@active = 'login'

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
	@username = session[:username]
	@active = 'home'

	@score = redis.hgetall('users:'+@username)['score']
	@contributions = redis.smembers('contributions:'+@username)
	@badges = redis.smembers('badges:'+@username)

	erb :home
end

get '/user/:username' do
	@username = params[:username]
	@title = 'Overview for '+@username

	# get list of this user's contributed links
	@user_contributions = {}
	@user_deadlinks = redis.smembers('contributions:'+@username)
	@user_deadlinks.each { |deadlink|
		@user_contributions[deadlink] = [] # array of hashes: [{altlink, score}, {altlink, score}, ... ]
		@alt_links = redis.smembers('contributions:'+@username+':'+deadlink)
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
	@remote = params[:remote] # was this called from the extension? (don't redirect if so)

	puts @remote
	puts params.inspect

	# check to see if this user exists and redirect if so
	@r_hash_name = 'users:'+@username
	if redis.hlen(@r_hash_name) > 0
		@hashed_pass = redis.hget @r_hash_name, 'password'
		@bcrypt_pass = BCrypt::Password.new @hashed_pass
		
		if @bcrypt_pass == @password
			session[:auth] = true
			session[:username] = @username
			if @remote
				'{"status": true, "username": "'+@username+'"}'
			else
				redirect '/home'
			end
		else
			if @remote
				'{"status": false, "reason": 0}' # 0 = bad login
			else
				redirect '/login?failed=1'
			end
		end
	else
		if @remote
			'{"status": false, "reason": 1}' # 1 = not registered
		else
			redirect '/signup?redirected=1'
		end
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

		# create new user in users set
		redis.sadd 'users', @username

		# create hew user hash
		redis.hmset @r_hash_name, 'password', @password, 'score', 0

		puts 'creating new user!'
		puts @password

		'true'
	else
		'false'
	end
end

get '/battle' do
	if not session[:auth]
		redirect '/login'
	end

	@username = session[:username]
	@title = 'Battle!'
	@active = 'battle'

	@links = []
	@dead_locs = redis.smembers 'dead_locs'
	@dead_locs.each { |loc|
		@alts = redis.hgetall('alts:'+loc)

		# only add to links list if there are no alternative links
		if @alts.length == 0
			@refs = redis.smembers('refs:'+loc)
			puts 'refs for '+loc+' is ', @refs
			@links.push( {'dead_loc' => loc, 'refs' => @refs} )
		end
	}

	puts 'links is ', @links

	erb :battle
end

get '/leaderboard' do
	if not session[:auth]
		redirect '/login'
	end

	@title = 'Leaderboard'
	@active = 'leaderboard'
	
	@usernames = redis.smembers 'users'
	@users = []
	@usernames.each { |user|
		@curr = redis.hgetall 'users:'+user
		@curr.delete('password')
		@curr['username'] = user
		@users.push(@curr)
	}

	@users = @users.sort_by { |hash| hash['score'] }
	@users.reverse!

	erb :leaderboard
end

def checkAuth()
	if session[:auth]
		redirect '/home'
	end
end
