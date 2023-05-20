import {
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import React from 'react';
import { Encoder, RecStatus } from 'main/types';
import { obsResolutions } from 'main/constants';
import { useSettings, setConfigValues } from './useSettings';
import {
  encoderFilter,
  mapEncoderToString,
  mapStringToEncoder,
} from './rendererutils';

const ipc = window.electron.ipcRenderer;

const formControlStyle = { m: 1, width: '100%' };

const selectStyle = {
  color: 'white',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'white',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#bb4220',
  },
  '&.Mui-focused': {
    borderColor: '#bb4220',
    color: '#bb4220',
  },
  '&:hover': {
    '&& fieldset': {
      borderColor: '#bb4220',
    },
  },
  '& .MuiOutlinedInput-root': {
    '&.Mui-focused fieldset': {
      borderColor: '#bb4220',
    },
  },
  '.MuiSvgIcon-root ': {
    fill: 'white !important',
  },
};

const outputResolutions = Object.keys(obsResolutions);
const fpsOptions = ['10', '20', '30', '60'];

interface IProps {
  recorderStatus: RecStatus;
}

/**
 * The video base controls. The distinction here between the controls in
 * VideoSourceControls is that the base controls can't be changed live.
 *
 *   - If we're mid encounter, we can't allow settings changes as we can't
 *     stop/start the recording without ruining the clip.
 *   - If WoW is open, OBS is recording but it's uninteresting footage,
 *     changes are allowed but we will need to restart the recorder.
 *   - Otherwise, let the user do whatever they want.
 */
const VideoBaseControls: React.FC<IProps> = (props: IProps) => {
  const [config, setConfig] = useSettings();
  const { recorderStatus } = props;
  const initialRender = React.useRef(true);

  const obsAvailableEncoders: Encoder[] = ipc
    .sendSync('getEncoders', [])
    .filter(encoderFilter)
    .map(mapStringToEncoder)
    .sort((a: Encoder, b: Encoder) => a.type < b.type);

  React.useEffect(() => {
    // Don't fire on the initial render.
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    setConfigValues({
      obsOutputResolution: config.obsOutputResolution,
      obsFPS: config.obsFPS,
      obsKBitRate: config.obsKBitRate,
      obsRecEncoder: config.obsRecEncoder,
    });

    ipc.sendMessage('settingsChange', []);
  }, [
    config.obsOutputResolution,
    config.obsFPS,
    config.obsKBitRate,
    config.obsRecEncoder,
  ]);

  const isComponentDisabled = () => {
    return recorderStatus === RecStatus.Recording;
  };

  const getMenuItem = (value: string) => {
    return (
      <MenuItem sx={{ height: '25px' }} key={value} value={value}>
        {value}
      </MenuItem>
    );
  };

  const getEncoderMenuItem = (enc: Encoder) => {
    return (
      <MenuItem sx={{ height: '25px' }} key={enc.name} value={enc.name}>
        {mapEncoderToString(enc)}
      </MenuItem>
    );
  };

  const getToggleButton = (value: string) => {
    return (
      <ToggleButton
        value={value}
        key={value}
        sx={{
          color: 'white',
          height: '40px',
          '&.Mui-selected, &.Mui-selected:hover': {
            color: 'white',
            backgroundColor: '#bb4420',
          },
        }}
      >
        {value}
      </ToggleButton>
    );
  };

  const setCanvasResolution = (event: SelectChangeEvent<string>) => {
    const {
      target: { value },
    } = event;

    setConfig((prevState) => {
      return {
        ...prevState,
        obsOutputResolution: value,
      };
    });
  };

  const getCanvasResolutionSelect = () => {
    if (isComponentDisabled()) {
      return <></>;
    }

    return (
      <FormControl size="small" sx={formControlStyle}>
        <InputLabel sx={selectStyle}>Canvas Resolution</InputLabel>
        <Select
          value={config.obsOutputResolution}
          label="Canvas Resolution"
          disabled={isComponentDisabled()}
          onChange={setCanvasResolution}
          sx={selectStyle}
          MenuProps={{
            PaperProps: {
              sx: {
                height: '300px',
                overflowY: 'scroll',
              },
            },
          }}
        >
          {outputResolutions.map(getMenuItem)}
        </Select>
      </FormControl>
    );
  };

  const setFPS = (_event: React.MouseEvent<HTMLElement>, fps: number) => {
    if (!fps === null) {
      return;
    }

    setConfig((prevState) => {
      return {
        ...prevState,
        obsFPS: fps,
      };
    });
  };

  const getFPSToggle = () => {
    if (isComponentDisabled()) {
      return <></>;
    }

    return (
      <FormControlLabel
        control={
          <ToggleButtonGroup
            value={config.obsFPS}
            disabled={isComponentDisabled()}
            exclusive
            onChange={setFPS}
            sx={{ border: '1px solid white', height: '40px' }}
          >
            {fpsOptions.map(getToggleButton)}
          </ToggleButtonGroup>
        }
        label="FPS"
        labelPlacement="top"
        sx={{ color: 'white', pb: 3 }}
      />
    );
  };

  const isBitrateValid = () => {
    return config.obsKBitRate > 1 && config.obsKBitRate < 300;
  };

  const getBitrateHelperText = () => {
    return isBitrateValid() ? '' : 'Must be between 1 and 300';
  };

  const setBitrate = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig((prevState) => {
      return {
        ...prevState,
        obsKBitRate: parseInt(event.target.value, 10),
      };
    });
  };

  const getDisabledText = () => {
    if (!isComponentDisabled()) {
      return <></>;
    }

    return (
      <Typography
        variant="h6"
        align="center"
        sx={{
          color: 'white',
          fontSize: '0.75rem',
          fontFamily: '"Arial",sans-serif',
          fontStyle: 'italic',
          textShadow:
            '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
        }}
      >
        These settings can not be modified while a recording is active.
      </Typography>
    );
  };

  const getBitrateField = () => {
    if (isComponentDisabled()) {
      return <></>;
    }

    return (
      <FormControl size="small" sx={formControlStyle}>
        <TextField
          size="small"
          value={config.obsKBitRate}
          disabled={isComponentDisabled()}
          onChange={setBitrate}
          label="Bitrate (Mbps)"
          variant="outlined"
          type="number"
          error={!isBitrateValid()}
          helperText={getBitrateHelperText()}
          sx={{ ...selectStyle }}
          InputLabelProps={{ shrink: true, style: { color: 'white' } }}
          inputProps={{ min: 1, style: { color: 'white' } }}
        />
      </FormControl>
    );
  };

  const setEncoder = (event: SelectChangeEvent<string>) => {
    const {
      target: { value },
    } = event;

    setConfig((prevState) => {
      return {
        ...prevState,
        obsRecEncoder: value,
      };
    });
  };

  const getEncoderSelect = () => {
    if (isComponentDisabled()) {
      return <></>;
    }

    return (
      <FormControl size="small" sx={formControlStyle}>
        <InputLabel sx={selectStyle}>Video Encoder</InputLabel>
        <Select
          value={config.obsRecEncoder}
          label="Video Encoder"
          disabled={isComponentDisabled()}
          onChange={setEncoder}
          sx={{ ...selectStyle }}
        >
          {obsAvailableEncoders.map(getEncoderMenuItem)}
        </Select>
      </FormControl>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
      }}
    >
      {getDisabledText()}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {getFPSToggle()}
        {getCanvasResolutionSelect()}
        {getBitrateField()}
        {getEncoderSelect()}
      </Box>
    </Box>
  );
};

export default VideoBaseControls;
