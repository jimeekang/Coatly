-- Allow 'exterior' as a valid estimate_category value
alter table quotes
  drop constraint if exists quotes_estimate_category_check;

alter table quotes
  add constraint quotes_estimate_category_check
    check (estimate_category in ('manual', 'interior', 'exterior'));
