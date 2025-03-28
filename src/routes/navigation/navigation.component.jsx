import { Fragment, use, useContext } from "react";
import { Outlet, Link } from "react-router-dom";

import CartIcon from "../../components/card-icon/card-icon.component";
import CartDropdown from "../../components/cart-dropdown/cart-drppdown.component";

import { UserContext } from '../../contexts/user.context';
import { CartContext } from "../../contexts/cart.context";

import { ReactComponent as CrwnLogo } from '../../assets/crown.svg';
import { signOutUser } from "../../utils/firebase/firebase.utils";

import {NavLink, NavLinks, NavigationContainer, LogoContainer} from './navigation.styles';

const Navigation = () => {
  const { currentUser } = useContext(UserContext);
  const { isCartOpen } = useContext(CartContext);
     
  return (
       <Fragment>
         <NavigationContainer>
           <LogoContainer to="/">
             <CrwnLogo />
           </LogoContainer>
           <NavLinks>
             <NavLink to="/shop">SHOP</NavLink>

             {currentUser ? (
               <NavLink as="span" onClick={signOutUser}>
                 SIGN OUT
               </NavLink>
             ) : (
               <NavLink to="/auth">SIGN IN</NavLink>
             )}
             <CartIcon />
           </NavLinks>
           {isCartOpen && <CartDropdown />}
         </NavigationContainer>
         <Outlet />
       </Fragment>
     );
};

export default Navigation;