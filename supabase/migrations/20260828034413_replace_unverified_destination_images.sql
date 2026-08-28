update public.destinations
set cover_image_url = null,
    image_attribution = null,
    image_license = null,
    image_source_url = null
where not image_verified;

update public.destinations set cover_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Irazu_Volcano.JPG/960px-Irazu_Volcano.JPG', image_verified = true, image_attribution = 'Rafael Golan', image_license = 'CC BY-SA 3.0', image_source_url = 'https://commons.wikimedia.org/wiki/File:Irazu_Volcano.JPG' where id = '5348f4c1-8357-43d8-9bb6-2e1f2153d772';
update public.destinations set cover_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Parque_Nacional_Manuel_Antonio_1.JPG/960px-Parque_Nacional_Manuel_Antonio_1.JPG', image_verified = true, image_attribution = 'Rauldmo', image_license = 'Public domain', image_source_url = 'https://commons.wikimedia.org/wiki/File:Parque_Nacional_Manuel_Antonio_1.JPG' where id = '9606095b-6788-499f-892a-2c3ff4682319';
update public.destinations set cover_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Arenal_volcano_%2870785p%29_%28cropped%29.jpg/960px-Arenal_volcano_%2870785p%29_%28cropped%29.jpg', image_verified = true, image_attribution = 'Rhododendrites', image_license = 'CC BY-SA 4.0', image_source_url = 'https://commons.wikimedia.org/wiki/File:Arenal_volcano_(70785p)_(cropped).jpg' where id = '90168df9-d141-4ff5-9683-49b6e1ff3517';
update public.destinations set cover_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Poas_crater.jpg/960px-Poas_crater.jpg', image_verified = true, image_attribution = 'Peter Andersen', image_license = 'CC BY 2.5', image_source_url = 'https://commons.wikimedia.org/wiki/File:Poas_crater.jpg' where id = 'a22f413f-9398-4154-a27f-7b1b2060a3a6';
