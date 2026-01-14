import React from 'react';
import { Box, IconButton, Stack, useMediaQuery, useTheme } from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enGB } from 'date-fns/locale';
import { DateRangePickerProps } from '../../types/component.types';

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = 'Date Range',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClear = () => {
    onStartDateChange(null);
    onEndDateChange(null);
  };

  const validateEndDate = (date: Date | null) => {
    if (!date || !startDate) return null;
    if (date < startDate) {
      return 'End date must be after start date';
    }
    return null;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
      <Box>
        <Stack
          direction={isMobile ? 'column' : 'row'}
          spacing={2}
          alignItems={isMobile ? 'stretch' : 'flex-start'}
        >
          <DatePicker
            label={`${label} - From`}
            value={startDate}
            onChange={onStartDateChange}
            format="dd/MM/yyyy"
            slotProps={{
              textField: {
                fullWidth: true,
                size: 'small',
              },
            }}
          />
          <DatePicker
            label={`${label} - To`}
            value={endDate}
            onChange={onEndDateChange}
            format="dd/MM/yyyy"
            minDate={startDate || undefined}
            slotProps={{
              textField: {
                fullWidth: true,
                size: 'small',
                error: !!validateEndDate(endDate),
                helperText: validateEndDate(endDate),
              },
            }}
          />
          {(startDate || endDate) && (
            <IconButton
              onClick={handleClear}
              size="small"
              aria-label="Clear dates"
              sx={{ alignSelf: isMobile ? 'flex-end' : 'center' }}
            >
              <ClearIcon />
            </IconButton>
          )}
        </Stack>
      </Box>
    </LocalizationProvider>
  );
};

export default DateRangePicker;
