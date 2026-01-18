import React from 'react';
import Hero from '../features/home/Hero';
import HowItWorks from '../features/home/HowItWorks';
import NearbyVehicles from '../features/home/NearbyVehicles';

const Home: React.FC = () => {
  return (
    <>
      <Hero />
      <HowItWorks />
      <NearbyVehicles />
    </>
  );
};

export default Home;