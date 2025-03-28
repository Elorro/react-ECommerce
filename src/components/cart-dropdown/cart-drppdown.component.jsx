import { useContext } from 'react';

import { useNavigate } from 'react-router-dom';

import { CartContext } from '../../contexts/cart.context';

import Button from '../button/button.component';

import CartItem from '../cart-item/cart-item.component';

import {CartDropdowunContainer, EmtyMessage,  CartItems} from './cart-dropdown.styles';

const CartDropdown = () => {
    const { cartItems } = useContext(CartContext);
    const navigate = useNavigate();

    const  goToCheckoutHandler = () => {
        navigate('/checkout');
    };

    return (
      <CartDropdowunContainer>
        <CartItems>
          {cartItems.length ? (
            cartItems.map((item) => <CartItem key={item.id} cartItem={item} />)
          ) : (
            <EmtyMessage>Your cart is empty</EmtyMessage>
          )}
        </CartItems>
        <Button onClick={goToCheckoutHandler}>GO TO CHECKOUT</Button>
      </CartDropdowunContainer>
    );
};

export default CartDropdown;