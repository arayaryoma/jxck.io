#!/usr/bin/env ruby

require "webrick"
require "json"

FILE_CSP  = "#{ENV['SERVER']}/logs/report-csp.log"
FILE_PING = "#{ENV['SERVER']}/logs/ping.log"
PORT      = ENV['PORT']

config = {
  :Port => PORT
}

def append(file, data)
  file = File.open(file, 'a')
  file.puts(data)
  file.close()
end

server = WEBrick::HTTPServer.new(config)

reporting = Proc.new do |req, res|
  if req&.header["content-type"]&.first != "application/csp-report"
    res.status = 400
  else
    begin
      report = JSON.generate(JSON.parse(req.body)) + "\n"
      append(FILE_CSP, report)
      res.status = 201
    rescue => e
      STDERR.puts e
      res.status = 500
    end
  end
end

# mount to /
server.mount_proc('/', reporting)

Signal.trap("INT") { server.shutdown }
server.start