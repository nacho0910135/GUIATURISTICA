-- Match the destination category symbols to their final visual meaning.
update public.app_options
set icon = case id
  when 'beaches' then 'island'
  when 'rivers-pools' then 'waves'
  else icon
end
where kind = 'destination_category'
  and id in ('beaches', 'rivers-pools');
