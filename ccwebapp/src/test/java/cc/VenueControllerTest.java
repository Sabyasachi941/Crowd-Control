package cc;
/**
 * Created by harryquigley on 18/05/2016.
 */


import org.junit.Before;
import org.junit.Test;
import org.mockito.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.Assert.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;


public class VenueControllerTest {

    @Mock //Mockito mock object
    private VenueService venueService;

    @InjectMocks //sets up mock controller & inserts mock objects into it
    private VenueController venueController;

    private MockMvc mockMvc;

    @Before
    public void setup(){
        //initialises controller & mocks
        MockitoAnnotations.initMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(venueController).build();
    }

    @Test
    public void testList() throws Exception{

        List<Venue> venues = new ArrayList<>();
        venues.add(new Venue());
        venues.add(new Venue());

        Mockito.when(venueService.listAllVenues()).thenReturn(venues);
        mockMvc.perform(get("/venues"))
                .andExpect(status().isOk())
                .andExpect(view().name("venuelist"))
                .andExpect(model().attribute("venues", hasSize(2)));
    }

    @Test
    public void testShow() throws Exception{
        Integer id = 1;

        Mockito.when(venueService.getVenueById(id)).thenReturn(new Venue());
        mockMvc.perform(get("/venue/1"))
                .andExpect(status().isOk())
                .andExpect(view().name("venueshow"))
                .andExpect(model().attribute("venue", instanceOf(Venue.class)));

    }

    @Test
    public void testEdit() throws Exception{
        Integer id = 1;

        Mockito.when(venueService.getVenueById(id)).thenReturn(new Venue());
        mockMvc.perform(get("/venue/edit/1"))
                .andExpect(status().isOk())
                .andExpect(view().name("venueform"))
                .andExpect(model().attribute("venue", instanceOf(Venue.class)));

    }

    @Test
    public void testNewVenue() throws Exception{
        Integer id = 1;

        //Venue Service should not be called to create a new venue
        Mockito.verifyZeroInteractions(venueService);

        mockMvc.perform(get("/venue/new"))
                .andExpect(status().isOk())
                .andExpect(view().name("venueform"))
                .andExpect(model().attribute("venue", instanceOf(Venue.class)));
    }

    //need to test binding of the venue being read in to be saved and the properties of the venue which is outputted as a result
    //Currently not passing due to id
    @Test
    public void testSaveVenue() throws Exception{
        Integer id = 1;
        String email = "example@hotmail.com";
        Integer capacity = 100;
        String password = "example";

        //id is automatically generated - can't set it
        Venue returnVenue = new Venue();
        returnVenue.setEmail(email);
        returnVenue.setCapacity(capacity);
        returnVenue.setPassword(password);
        //should i set timestamps also?

        Mockito.when(venueService.saveVenue(Matchers.<Venue>any())).thenReturn(returnVenue);

        mockMvc.perform(post("/venue")
                .param("id","1")
                .param("email","example@hotmail.com")
                .param("capacity","100")
                .param("password","example"))
                    .andExpect(status().is3xxRedirection()) //checks if there was redirect - there should be
                    .andExpect(view().name("redirect:/venue/10"))
                    .andExpect(model().attribute("venue", instanceOf(Venue.class)))
                    .andExpect(model().attribute("venue", hasProperty("id",is(id))))
                    .andExpect(model().attribute("venue", hasProperty("email",is(email))))
                    .andExpect(model().attribute("venue", hasProperty("capacity",is(capacity))))
                    .andExpect(model().attribute("venue", hasProperty("password",is(password))));

        //verify properties of bound Venue
        ArgumentCaptor<Venue> boundVenue = ArgumentCaptor.forClass(Venue.class);
        Mockito.verify(venueService).saveVenue(boundVenue.capture());

        assertEquals(id, boundVenue.getValue().getId());
        assertEquals(email, boundVenue.getValue().getEmail());
        assertEquals(capacity, boundVenue.getValue().getCapacity());
        assertEquals(password, boundVenue.getValue().getPassword());

    }

    @Test
    public void testDelete() throws Exception{
        Integer id = 1;
        mockMvc.perform(get("/venue/delete/1"))
                .andExpect(status().is3xxRedirection())
                .andExpect(view().name("redirect:/venues"));

        //check if venue service was called 1 time
        Mockito.verify(venueService, Mockito.times(1)).deleteVenue(id);
    }

}
