begin;

alter table public.destination_visit_info
  add column if not exists booking_contact text,
  add column if not exists booking_price text,
  add column if not exists booking_notes text;

create temporary table confirmed_booking_destinations (
  destination_id uuid primary key,
  reservation_required boolean not null,
  booking_url text,
  booking_contact text,
  booking_price text not null,
  booking_notes text not null,
  price_national_crc numeric(10,2),
  price_foreigner_usd numeric(10,2)
) on commit drop;

insert into confirmed_booking_destinations values
  ('9606095b-6788-499f-892a-2c3ff4682319', true,  'https://serviciosenlinea.sinac.go.cr', null, 'Adultos no residentes: $18.08; niños de 2 a 12 años: $5.65', 'Reserva obligatoria a través del SINAC. Cierra los martes.', null, 18.08),
  ('a22f413f-9398-4154-a27f-7b1b2060a3a6', true,  'https://serviciosenlinea.sinac.go.cr', null, 'Extranjeros: $22', 'Reserva obligatoria mediante SICORE, con cupos limitados de 200 personas por turno.', null, 22),
  ('5348f4c1-8357-43d8-9bb6-2e1f2153d772', true,  'https://serviciosenlinea.sinac.go.cr', null, 'Consultar en SINAC; parqueo: ₡3.000 en el sitio', 'Reserva obligatoria. Debe presentar el número de reserva y pagar el parqueo en el sitio. El sector Prusia también utiliza SICORE.', null, null),
  ('45f67eb0-bad9-4935-a37e-cec72fc06736', true,  'https://serviciosenlinea.sinac.go.cr', null, 'Nacionales mayores de 13 años: ₡1.130; no residentes: $11.30; niños de 2 a 12 años: $5.65', 'Reserva obligatoria en SICORE desde el 1 de mayo de 2025.', 1130, 11.30),
  ('8104fe85-a950-405b-b901-3706932f25cb', true,  null, 'reservaciones.pnc@sinac.go.cr', 'Adulto nacional: ₡1.808; adulto extranjero: $16.95; buceo adicional: $4.52 (IVA incluido)', 'Reserva y pago previo obligatorios, con un máximo de 8 días de antelación. Es obligatorio ingresar con un guía local registrado.', 1808, 16.95),
  ('cbfd7724-96b7-41b3-9c2f-efc1da9eb19b', true,  'https://serviciosenlinea.sinac.go.cr', '2659-1551 / 8721-2444 / 8539-1010', 'Consultar al reservar', 'La visita guiada a las cavernas requiere reserva telefónica anticipada.', null, null),
  ('a7bc2b3b-8fd3-44c8-a263-477f937b3021', false, 'https://serviciosenlinea.sinac.go.cr', null, 'Adultos nacionales: ₡1.130; adultos extranjeros: $16.95', 'Tarifas del sector Las Pailas. El sector Santa María permite acampar con reservación en línea; revise el estado de los senderos.', 1130, 16.95),
  ('afe6a9cc-0b88-4c82-9cfb-908352b194c2', true,  'https://serviciosenlinea.sinac.go.cr', null, 'Aproximadamente $17; confirmar en SINAC', 'Parque integrado al sistema SICORE. Confirme el precio al reservar.', null, 17),
  ('da9f4b97-48c3-4d1b-a922-b1ce39ba8de9', false, 'https://www.tabacon.com', null, 'Adultos: $110 sin comidas; comidas: $25–40 adicionales', 'Atracción privada con cupo limitado. Se recomienda reservar con una o dos semanas de anticipación.', null, 110),
  ('1fc1f83f-03fe-4c96-b3cb-a9a0595110f3', false, null, '+506 2482-2720 / +506 2257-4171', 'No residentes: $56 adultos; $40 niños de 3 a 12 años, más impuestos', 'No requiere reserva previa. Precios indicados como vigentes hasta el 15 de diciembre de 2026.', null, 56),
  ('50bda7b6-2c60-494d-9856-8ad8bf470196', false, 'https://www.civitatis.com/es/arenal/excursion-catarata-fortuna/', '+506 2479-8004 (Red Lava TSC S.A.)', 'Nacionales: $10 adultos y $5 menores/adultos mayores; menores de 8 años gratis. Extranjeros: $10–20', 'Atracción privada que permite reservar con anticipación.', null, 20),
  ('f1f8bc1a-b426-41b5-81ad-c8f3475e1eb4', false, 'https://www.reservamonteverde.com', '+506 2645-5110', 'Adultos: $25; niños de 6 a 11 años y estudiantes: $12; estacionamiento: $5', 'Se recomienda reservar con anticipación.', null, 25),
  ('f9ca5c97-578c-44b3-bb5e-a02f6bcacca1', false, 'https://serviciosenlinea.sinac.go.cr', null, 'Nacionales: ₡1.000 más IVA; extranjeros: $10 más IVA', 'Reserva recomendada mediante SINAC.', 1000, 10),
  ('fa963435-94a7-4832-a9cb-4e544ca4288c', true,  'https://serviciosenlinea.sinac.go.cr', null, 'Consultar en SINAC', 'Reserva obligatoria con cupos limitados; se recomienda realizarla con anticipación.', null, null),
  ('c2c78023-81a4-41dc-a297-184b2609f17d', false, null, null, 'Aproximadamente $6–7 por persona', 'No requiere reserva. La visita está sujeta a las mareas.', null, 7),
  ('7cc91f6c-81a4-475b-8f76-640d84bbe216', false, 'https://serviciosenlinea.sinac.go.cr', null, 'Consultar en SINAC', 'Revise la temporada de anidación antes de visitar.', null, null),
  ('4d287a05-ab6a-4172-930f-1ae7280a3a6d', false, 'https://serviciosenlinea.sinac.go.cr', null, 'Consultar en SINAC', 'Se recomienda reservar con anticipación.', null, null),
  ('90168df9-d141-4ff5-9683-49b6e1ff3517', true,  'https://serviciosenlinea.sinac.go.cr', null, 'Consultar en SINAC', 'La entrada tiene cupo limitado y se gestiona mediante SINAC.', null, null),
  ('d599ee5d-2dbe-4886-9cd9-f3dbb48271c4', false, 'https://serviciosenlinea.sinac.go.cr', null, 'Consultar en SINAC', 'Reserva recomendada.', null, null),
  ('c4449fdb-0f4c-49b4-9389-504edecacafc', false, 'https://reservasantaelena.org', null, 'Consultar en el sitio web oficial', 'Consulte disponibilidad y reserve en el sitio web oficial.', null, null);

do $$
begin
  if (select count(*) from confirmed_booking_destinations) <> 20 then
    raise exception 'Expected 20 confirmed booking destinations';
  end if;
  if (select count(*) from public.destinations d join confirmed_booking_destinations c on c.destination_id = d.id) <> 20 then
    raise exception 'All 20 confirmed booking destinations must exist';
  end if;
end
$$;

update public.destinations
set fee_type = 'Gratuito',
    price_national_crc = 0,
    price_foreigner_usd = 0,
    requires_online_ticket = false,
    online_ticket_url = null,
    requires_sinac_booking = false,
    sinac_booking_url = null
where id not in (select destination_id from confirmed_booking_destinations)
  and (
    fee_type = 'De Pago'
    or coalesce(price_national_crc, 0) > 0
    or coalesce(price_foreigner_usd, 0) > 0
    or requires_online_ticket
    or requires_sinac_booking
  );

update public.destination_visit_info
set reserva_requerida = false,
    booking_contact = null,
    booking_price = null,
    booking_notes = null,
    updated_at = now()
where destination_id not in (select destination_id from confirmed_booking_destinations)
  and (
    reserva_requerida
    or booking_contact is not null
    or booking_price is not null
    or booking_notes is not null
  );

update public.destinations d
set fee_type = 'De Pago',
    price_national_crc = coalesce(c.price_national_crc, d.price_national_crc),
    price_foreigner_usd = coalesce(c.price_foreigner_usd, d.price_foreigner_usd),
    requires_online_ticket = c.reservation_required and c.booking_url is not null,
    online_ticket_url = case when c.reservation_required then c.booking_url end,
    requires_sinac_booking = c.reservation_required and c.booking_url = 'https://serviciosenlinea.sinac.go.cr',
    sinac_booking_url = case when c.reservation_required and c.booking_url = 'https://serviciosenlinea.sinac.go.cr' then c.booking_url end
from confirmed_booking_destinations c
where d.id = c.destination_id;

insert into public.destination_visit_info (
  destination_id, enlace_web, reserva_requerida, booking_contact, booking_price, booking_notes
)
select destination_id, booking_url, reservation_required, booking_contact, booking_price, booking_notes
from confirmed_booking_destinations
on conflict (destination_id) do update set
  enlace_web = excluded.enlace_web,
  reserva_requerida = excluded.reserva_requerida,
  booking_contact = excluded.booking_contact,
  booking_price = excluded.booking_price,
  booking_notes = excluded.booking_notes,
  updated_at = now();

do $$
begin
  if (select count(*) from public.destinations where fee_type = 'De Pago') <> 20 then
    raise exception 'Exactly 20 destinations must remain marked as paid';
  end if;
  if (select count(*) from public.destination_visit_info where reserva_requerida) <> 9 then
    raise exception 'Exactly 9 destinations must remain marked as requiring reservation';
  end if;
end
$$;

commit;
