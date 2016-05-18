package cc;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.instanceOf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;


/**
 * Created by harryquigley on 18/05/2016.
 */
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


}
