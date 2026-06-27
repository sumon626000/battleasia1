WITH banners(url) AS (
  VALUES
    ('/banners/erangel-sunset.jpg'),
    ('/banners/miramar-convoy.jpg'),
    ('/banners/vikendi-snow.jpg'),
    ('/banners/sanhok-jungle.jpg'),
    ('/banners/night-ops.jpg'),
    ('/banners/airdrop-jump.jpg'),
    ('/banners/airdrop.jpg'),
    ('/banners/sniper.jpg'),
    ('/banners/squad.jpg'),
    ('/banners/vehicle.jpg'),
    ('/banners/soldier.jpg'),
    ('/banners/warzone.jpg'),
    ('/banners/solo.jpg'),
    ('/banners/duo.jpg'),
    ('/banners/squad-team.jpg'),
    ('/banners/tdm.jpg')
), numbered AS (
  SELECT url, row_number() OVER () - 1 AS idx, count(*) OVER () AS total FROM banners
)
UPDATE public.matches m
SET banner_image_url = n.url
FROM numbered n
WHERE (m.banner_image_url IS NULL OR m.banner_image_url = '')
  AND n.idx = (m.id % n.total);