-- Remove the retired tourist-information category from Assistance & Emergencies.
DELETE FROM public.commercial_services
WHERE main_category IN ('informacion_turistica', 'tourist_information');
