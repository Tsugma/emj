use Rack::Static,
  :urls => ["/images", "/js", "/css", "fonts"],
  :root => "public"

map "/" do
  run lambda { |env|
  [
    200,
    {
      'Content-Type'  => 'text/html',
      'Cache-Control' => 'public, max-age=86400'
    },
    File.open('public/index.html', File::RDONLY)
  ]
}
end
map "/thank-you" do
  run lambda { |env|
  [
    200,
    {
      'Content-Type'  => 'text/html',
      'Cache-Control' => 'public, max-age=86400'
    },
    File.open('public/thank-you.html', File::RDONLY)
  ]
}
end
